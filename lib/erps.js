/*
 * ERPS Info
 * https://github.com/alrighttheresham/psmc
 *
 * Copyright (c) 2013 Damian ONeill
 * Licensed under the MIT license.
 */

'use strict';

var rest = require('restless');
var helper = require('./helper');
var columnizer = require('columnizer');

function summaryToConsole(data) {
    if(data.networkService) {
	    var list = new Array();
	    for (var i = 0; i < data.networkService.length; i++) {
	        if(data.networkService[i].type === 'ERPS') {
	           list.push(data.networkService[i]);
	        }
	    }

	    var erps = new columnizer;
	    erps.row("Service Name", "SVLAN", "Mgmt Domain");
	    for(var i = 0; i < list.length; i++) {
           var service = list[i];
           erps.row(service.name, service.id, service.managementDomainName);
	    }
	    erps.print();
    }
}

function detailToConsole(data, opts) {
    if(data.networkService) {
        for (var i = 0; i < data.networkService.length; i++) {
            if (data.networkService[i].id === opts.vlan && (opts.domain == null || data.networkService[i].managementDomainName === opts.domain)) {
                var service = data.networkService[i];
                
                console.log("ERPS Service " + service.name + " (SVLAN " + service.id + ") in Domain '" + service.managementDomainName + "'");
                
                var erps = new columnizer;
                erps.row("Network Element", "Switch", "Port", "Service State", "Port Role", "Port State", "Link State");
                
                for (var j = 0; j < service.serviceNetworkElements.length; j++) {
                    var sne = service.serviceNetworkElements[j];
                    for (var k = 0; k < sne.switchList.length; k++) {
                        var ss = sne.switchList[k];
                        for(var l = 0; l < ss.servicePortList.length; l++) {
                            var sp = ss.servicePortList[l];
                            erps.row(sne.ipAddress, ss.index, portToString(sp.port), 
                                serviceStateToString(ss.erpsSettings.operStatus),
                                portRoleToString(sp.erpsSettings.rplPort),
                                portStateToString(sp.erpsSettings.portStatus),                                
                                linkStateToString(sp.erpsSettings.linkStatus, sp.erpsSettings.remoteLinkStatus));
                        }
                    }
                }
                
                erps.print();
            }
        }
    }
}

function portRoleToString(role) {
    if(role) {
        return "rpl port";
    }
    return "normal";
}

function serviceStateToString(state) {
    if(state === "PROTECTION") {
        return "protecting";
    } else if(state === "IDLE") {
        return "idle";
    } else if(state == "FORCE_SWITCH") {
        return "force switch";
    } else if(state == "MANUAL_SWITCH") {
        return "manual switch";
    } else if(state == "PENDING") {
        return "pending";
    } else if(state == "DISABLE") {
        return "disable";
    }
    return state;
}

function linkStateToString(local, remote) {
    if(local === "FAILED") {
        return "signal fail";
     } else if(remote == "FAILED") {
        return "remote signal fail";
     }
     return "normal";
 }

function portStateToString(state) {
    if(state === "UNBLOCKED") {
        return "unblocked";
    } else if(state === "BLOCKING") {
        return "blocked";
    }
    return state;
}

function portToString(port) {
    return port.shelfIndex + ":" + port.slotIndex + ":" + port.type + ":" + port.index;
}

exports.command = function (opts) {
    opts.command('erps')
        .option('list', {
            abbr:'l',
            flag:true,
            help:"(default) get a list of erps services"
        })
        .option('vlan', {
            abbr:'v',
            metvar: 'VLAN',
            help:"get details of all erps services with provided vlan"
        })
        .option('domain', {
            abbr:'d',
            metvar: 'DOMAIN',
            help:"get details of an erps service with provided vlan and domain"
        })
        .help("Provides information on erps services.")
        .callback(function (opts) {
            rest.get(helper.getURL(opts) + 'NetworkServices', helper.getOptions(opts),
                  function (error, data) {
                    if(opts.vlan) {
                        if (error instanceof Error) {
                            helper.handleError(error.message);
                        } else {
                            detailToConsole(data, opts);
                        }
                    } else {
                        if (error instanceof Error) {
                            helper.handleError(error.message);
                        } else {
                            summaryToConsole(data);
                        }
                    }
                  });
        });
};