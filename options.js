var storage = chrome.storage.local;

function storageSetter(options) {
    var key = options.key;
    var id = options.id;
    var negate = options.negate;
    var callback = options.callback;
    var explicitValue = options.explicitValue;
    var value = options.value;
    storage.get(key, (items) => {
        items = items[key] || {};

        if (explicitValue) {
            items[id] = value;
        }
        else {
            if (typeof(items[id]) === 'undefined') {
                items[id] = true;
            }
            else {
                items[id] = !items[id];
            }
        }

        var strg = {};
        strg[key] = items;
        storage.set(strg, () => {
            if (callback) {
                if (explicitValue) {
                    callback(value);
                }
                else {
                    // passes boolean to indicate visibility
                    if (negate) {
                        callback(!items[id]);
                    }
                    else {
                        callback(!items[id]);
                    }
                }
            }
        });
    });
}

function toggleMinimizedTicket(ticket_id, callback) {
    storageSetter({
        key: 'minimizedTickets',
        id: ticket_id,
        negate: true,
        callback: callback
    });
}

function toggleCompletedTicket(ticket_id, value, callback) {
    storageSetter({
        key: 'completedTickets',
        id: ticket_id,
        explicitValue: true,
        value: value,
        callback: callback
    });
}

function toggleCompletedTicketItem(id, callback) {
    storageSetter({
        key: 'minimizedTicketItems',
        id: id,
        negate: true,
        callback: callback
    });
}

function toggleCompletedTicketItems(ticket_id, value, callback) {
    storageSetter({
        key: 'allTicketItemsCompleted',
        id: ticket_id,
        explicitValue: true,
        value: value,
        callback: callback
    });
}

function getOrders(callback) {
    loadOrders((orders) => {
        orders = sortOrders(orders);
        callback(orders);
    });
}

const OK = '200 OK';

function getOrdersFromResponse(response, shouldAlert) {
    var orders = [];

    if (response.status === OK) {
        if (response.data.length) {
            for (var i = 0; i < response.data.length; i++) {
                if (response.data[i].status) {
                    orders = orders.concat(getOrdersFromResponse(response.data[i]));
                }
                else {
                    orders.push(response.data[i]);
                }
            }
        }
    }
    else if (shouldAlert) {
        alert('An issue occurred! You may need to log back in?');
    }

    for (var i = 0, o = orders[i]; i < orders.length; o = orders[++i]) {
        o.id = `${o.meta_info.app_id}_${o.meta_info.order_id}`;
        o.index = i + 1;
        for (var j = 0, m = o.menu_items[j]; j < o.menu_items.length; m = o.menu_items[++j]) {
            m.id = `${o.id}_${m.item_number}`;
        }
    }

    return orders;
}

function loadOrders(callback) {
    fetch('https://dashboard.ordermark.com/api/orderV2/dashboard?h=24&a=0,1,2')
        .then(function(response) {
            if (response.status !== 200) {
                alert("You need to sign into Ordermark!");
                callback([]);
            }
            else {
                response.json().then(function(r) {
                    var orders = getOrdersFromResponse(r, true);
                    callback(orders);
                });
            }
        })
        .catch(function(err) {
            $('#apiIssue').html("An error may have occurred with the Ordermark API. If this message stays for more than 15 seconds, try reloading the page.").addClass('show');
            console.log(err);
            callback([]);
        });
}

function contains(set, element, expression) {
    return set.filter(e => {
        if (expression) {
            return expression(e) === expression(element);
        }
        else {
            return e === element;
        }
    }).length > 0;
}

function sortOrders(orders) {
    // remove duplicates
    var temp = [];
    for (var i = 0, o = orders[i]; i < orders.length; o = orders[++i]) {
        if (!contains(temp, o, e => e.meta_info.order_id)) {
            temp.push(o);
        }
    }
    orders = temp;
    // sort by most recent (?)
    orders = $(orders).sort((a, b) => new Date(a.order.placed_date) < new Date(b.order.placed_date)).toArray();
    return orders;
}

var orderTemplateName = 'order';
var completedOrderTemplateName = 'completedOrder';

var rendererFrame = document.getElementById('rendererFrame');

var templates;
var loadedOrders;

window.addEventListener('message', function (event) {
    var command = event.data.command;
    switch (command) {
        case 'compiledTemplates':
            pageload();
            break;
        case 'finalStepsCompleted':
            finishRenderCycle();
            break;
        case 'pageload':
            templates = {};
            templates[orderTemplateName] = document.getElementById('kd-order-template').innerHTML;
            templates[completedOrderTemplateName] = document.getElementById('kd-completed-order-template').innerHTML;

            var message = {
                command: 'compileTemplates',
                templates: templates
            };
            rendererFrame.contentWindow.postMessage(message, '*');
            break;
        case 'renderedTemplate':
            var target = this.document.getElementById(event.data.target);
            target.innerHTML = event.data.renderedTemplate;
            break;
    }
});

function render(target, templateName, object) {
    var msg = {
        command: 'renderTemplate',
        target: target,
        templateName: templateName,
        object: object
    };
    rendererFrame.contentWindow.postMessage(msg, '*');
}

function pageload() {
    startRenderCycle();
    setInterval(startRenderCycle, 60000);
}

function startRenderCycle() {
    getOrders((o) => {
        loadedOrders = o;
        $('#loadingIndicator').collapse('hide');
        var message = {
            command: 'finalStepsBeforeRendering',
            templates: templates
        };
        rendererFrame.contentWindow.postMessage(message, '*');
    });
}

function finishRenderCycle() {
    render('kd-completed-orders-container', completedOrderTemplateName, { orders: loadedOrders });
    render('kd-orders-container', orderTemplateName, { orders: loadedOrders });
}

$(document).click('.ticket-toggle', function (event) {
    var t = $(event.currentTarget.activeElement);
    var id = t.data('id');
    if (t.hasClass('ticket-toggle')) {
        toggleMinimizedTicket(id, (isVisible) => {
            // we don't need to do anything here right now
        });
    }
});

$(document).click('.item-toggle', function (event) {
    var t = $($(event.target).closest('a'));
    if (t.hasClass('item-toggle')) {
        setTimeout(() => {
            var id = t.data('id');
            var name = t.data('name');
            var $mods = $(`#${id}-modifiers`);
            var itemsContainer = $(t.closest('.kd-items'));
            var ticket_id = itemsContainer.data('ticket-id');
            var readyToComplete = $(`#${ticket_id}-ready-to-complete`);

            toggleCompletedTicketItem(id, (isVisible) => {
                if (isVisible) {
                    t.html(name);
                    $mods.collapse('show');
                    // All items haven't been completed if this item is visible
                    toggleCompletedTicketItems(ticket_id, false);
                    readyToComplete.collapse('hide');
                }
                else {
                    t.html(`<s>${name}</s>`);
                    $mods.collapse('hide');
                    var items = itemsContainer.find('.item-toggle');
                    if (items.length === items.find('s').length) {
                        toggleCompletedTicketItems(ticket_id, true);
                        readyToComplete.collapse('show');
                    }
                }
            });
        }, (1)); 
    }
});

$(document).click('.complete-ticket', function (event) {
    var t = $(event.currentTarget.activeElement);
    if (t.hasClass('complete-ticket')) {
        var ticket_id = t.data('id');
        toggleCompletedTicket(ticket_id, true);
        $(`#${ticket_id}-kd-completed-ticket`).collapse('show');
        $(`#${ticket_id}-kd-ticket`).collapse('hide');
    }
});

$(document).click('.restore-ticket', function (event) {
    var t = $(event.currentTarget.activeElement);
    if (t.hasClass('restore-ticket')) {
        var ticket_id = t.data('id');
        toggleCompletedTicket(ticket_id, false);
        $(`#${ticket_id}-kd-completed-ticket`).collapse('hide');
        $(`#${ticket_id}-kd-ticket`).collapse('show');
    }
});

$('#clearLocalStorage').click(function () {
    chrome.storage.local.clear(function() {
        var error = chrome.runtime.lastError;
        if (error) {
            console.error(error);
        }
        window.location.reload(true);
    });
});

