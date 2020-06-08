var storage = chrome.storage.local;

var minimizedTickets;
var minimizedTicketItems;
var allTicketItemsCompleted;
var isCompletedTicket;

function loadPageloadStorageItems(completedCallback) {
    storage.get('minimizedTicketItems', (items) => {
        minimizedTicketItems = items.minimizedTicketItems;
        storage.get('minimizedTickets', (items) => {
            minimizedTickets = items.minimizedTickets;
            storage.get('allTicketItemsCompleted', (items) => {
                allTicketItemsCompleted = items.allTicketItemsCompleted;
                storage.get('completedTickets', (items) => {
                    completedTickets = items.completedTickets;
                    completedCallback();
                });
            });
        });
    });
}

Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('unlessEquals', function(arg1, arg2, options) {
    return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('removeChooseYour', function(value) {
    const toReplace = 'Choose your ';
    if (value.indexOf(toReplace) === 0) {
        value = value.replace(toReplace, '');
        return value.charAt(0).toUpperCase() + value.slice(1);
    }
    else {
        return value;
    }
});

Handlebars.registerHelper('isMinimizedTicketItem', function (id, options) {
    if (minimizedTicketItems && minimizedTicketItems[id]) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

Handlebars.registerHelper('isMinimizedTicket', function (id, options) {
    if (minimizedTickets && minimizedTickets[id]) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

Handlebars.registerHelper('areAllTicketItemsCompleted', function (id, options) {
    if (allTicketItemsCompleted && allTicketItemsCompleted[id]) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

Handlebars.registerHelper('isCompletedTicket', function (id, options) {
    if (completedTickets && completedTickets[id]) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

function formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatMinutes(minutes) {
    var result = '';
    var hours = Math.floor(minutes / 60);
    var d = Math.floor(hours / 24);
    var h = hours - (d * 24);
    var m = minutes - (hours * 60);

    if (d > 0) {
        if (d === 1) {
            result += '1 day';
        }
        else {
            result += `${formatNumber(d)} days`;
        }
        if (h > 0 || m > 0) {
            result += ', ';
        }
    }
    if (h > 0) {
        if (h === 1) {
            result += '1 hr';
        }
        else {
            result += `${formatNumber(h)} hrs`;
        }
        if (m > 0) {
            result += ', ';
        }
    }
    if (m > 0) {
        if (m === 1) {
            result += '1 min';
        }
        else {
            result += `${formatNumber(m)} mins`;
        }
    }

    return result;
}

function makeLocalTime(datetime) {
    if (datetime && datetime.charAt(datetime.length - 1) == 'Z') {
        datetime = datetime.substr(0, datetime.length - 1);
    }
    return datetime;
}

Handlebars.registerHelper('getMinutesSinceTime', function (datetime, options) {
    if (datetime) {
        var diff = Math.abs(new Date() - new Date(makeLocalTime(datetime)));
        var minutes = Math.floor((diff/1000)/60);
        
        return `Placed ${formatMinutes(minutes)} ago`;
    }
    else {
        return '';
    }
});

Handlebars.registerHelper('getDueMinutes', function (datetime, options) {
    if (datetime) {

        var diff = new Date(makeLocalTime(datetime)) - new Date();
        var minutes = Math.floor((diff/1000)/60);
        if (minutes < 0) {
            return `Due ${formatMinutes(minutes * -1)} ago`;
        }
        else {
            return `Due in ${formatMinutes(minutes)}`;
        }
    }
    else {
        return '';
    }
});

var templates = {};

window.addEventListener('message', function(event) {
    var command = event.data.command;
    switch (command) {
        case 'compileTemplates':
            var srcTemplates = event.data.templates;
            var keys = Object.keys(srcTemplates);
            for (var i = 0; i < keys.length; i++) {
                templates[keys[i]] = Handlebars.compile(srcTemplates[keys[i]]);
            }
            event.source.postMessage({
                command: 'compiledTemplates',
            }, event.origin);
            break;
        case 'renderTemplate':
            renderedTemplate = templates[event.data.templateName](event.data.object);
            event.source.postMessage({
                command: 'renderedTemplate',
                target: event.data.target,
                renderedTemplate: renderedTemplate
            }, event.origin);
            break;
        case 'finalStepsBeforeRendering':
            loadPageloadStorageItems(() => {
                event.source.postMessage({
                    command: 'finalStepsCompleted',
                }, event.origin);
            });
            break;
    }
});

top.postMessage({
    command: 'pageload',
}, '*');