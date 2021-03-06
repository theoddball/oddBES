//Begin quicklist.js
var Page = require('../page'),
    Script = require('../script'),
    DataStore = require('../datastore');

var currencyNames = { "long": 
    { "keys": ["key", "keys"], 
      "metal": ["ref", "ref"] }, 
      "short": 
      { "keys": ["k", "k"], 
        "metal": ["r", "r"] } 
    },
    defaults = [
        { metal: 0.05, keys: 0, message: "" },
        { metal: 0.11, keys: 0, message: "" },
        { metal: 0, keys: 1, message: "" }
    ],
    values;

function loadQuicklists() {
    var customlists = DataStore.getItem("bes-quicklists");

    if (customlists) {
        values = JSON.parse(customlists);
    } else {
        values = defaults;
        DataStore.setItem("bes-quicklists", JSON.stringify(values));
    }
}

function addQuicklistPanelButtons() {
    $('#show-markdown-modal').before(' <a id="bp-custom-select-ql" class="btn btn-default btn-primary btn-xs disabled" href="##">Quicklist selection</a>');
}

// Change whether or not the Quicklist button is active
function updateSelectQuicklist() {
    $("#bp-custom-select-ql").toggleClass("disabled", !inventory.selectionMode);
}

function onActionButtonClick() {
    var $this = $(this),
    action = $this.data('action');

    if (action === 'select') {
        copyButtonValues(values[$(this).data('idx')], $('.ql-button-values'));
    } else if (action === 'listbatch') {
        listSelection(buttonValue($('.ql-button-values')));
        Page.hideModal();
    }
}

function findSample() {
    return $('[data-listing_offers_url]').first();
}

// Selected items don't have the unselected class, while unselected ones do
function currentSelection() {
    return $('.item:not(.spacer,.unselected,.ql-cloned):visible').filter(function () {
        var item = $(this);
        return item.data("can_sell") && !item.data("listing_account_id");
    });
}

function qlFormatValue(value, short) {
    var str = [],
    cnames = currencyNames[short ? "short" : "long"],
    space = short ? "" : " ";

    if (value.keys) str.push(value.keys + space + cnames.keys[+(value.keys !== 1)]);
    if (value.metal) str.push(value.metal + space + cnames.metal[+(value.metal !== 1)]);
    return str.join(', ');
}

function addStyles() {
    Page.addStyle(
            ".ql-button-value-idx { margin-right: 3px; }"
            );
}

function quicklistSelectHtml(value, idx) {
    return '<a class="btn btn-primary ql-button-value-idx ql-action-button" data-action="select" data-idx="' + idx + '" style="margin-right: 3px;">' + qlFormatValue(value, true) + '</a>';
}

function quicklistBtnHtml(metal, keys, message, remove) {
    return '<div class="ql-button-values">' +
        '<div class="row">' +
        '<div class="col-md-3"><label>Metal</label>' +
        '<input type="text" placeholder="0" class="col-md-3 ql-metal form-control" value="' + metal + '"></div>' +
        '<div class="col-md-3"><label>Keys</label>' +
        '<input type="text" placeholder="0" class="col-md-3 ql-keys form-control" value="' + keys + '"></div>' +
        (remove !== false ? '<a class="btn btn-primary btn-xs ql-remove-button">Remove</a>' : '') +
        '</div>' +
        '<div class="row">' +
        '<div class="col-md-12"><label>Message</label>' +
        '<input type="text" class="col-md-3 form-control ql-message" value="' + Page.escapeHtml(message) + '"></div>' +
        '</div>' +
        '</div>';
}

function selectQuicklist() {
    var selection;
    if (!findSample().length) {
        return window.alert("Create a regular listing first, so the trade offer url can be copied.");
    }

    selection = currentSelection();
    if (!selection.length) {
        return window.alert("No listable items in this selection.");
    }

    var html =
        "<p>Select a preset for this batch of items, or enter one manually. Click on the respective button to fill in the values.</p>" +
        "<div id='ql-cloned-batch' class='row'></div>" +
        "<div id='ql-button-listing' class='row'>";

    values.forEach(function (vals, idx) {
        html += quicklistSelectHtml(vals, idx);
    });

    html += "</div><br>";
    html += quicklistBtnHtml("", "", "", "", false);

    Page.modal("List Items", html, '<a class="btn btn-default btn-primary ql-action-button" data-action="listbatch">List Batch</a>');

    $("#ql-cloned-batch").html(selection.clone()).find('.item').addClass('ql-cloned');
    $("#ql-button-listing .ql-select-msg").last().css('margin-bottom', '-8px');
    $(".ql-button-value-idx").tooltip({
        html: false,
        title: function () { return values[$(this).data('idx')].message || "(none)"; },
        placement: 'top'
    });

    Page.addItemPopovers($('.ql-cloned'), $('#ql-cloned-batch'));
}

function addEventListeners() {
    $(document).on('click', '.ql-action-button', onActionButtonClick);

    $("#bp-custom-select-ql").click(function () {
        if (inventory.selectionMode) {
            selectQuicklist();
        }
    });
}


function listSelection(value) {
    var selection = currentSelection(),
    sample = findSample(),
    items = [],
    at = 0;

    clearSelection();
    updateSelectQuicklist();
    updateClearSelectionState();

    selection.each(function () {
        var $this = $(this);
        items.push($this.data('id'));

        $this.find('.tag.bottom-right').html('<i class="fa fa-spin fa-spinner"></i>');
    });

    function next() {
        if (!items[at]) return;
        listItem(items[at], value, sample, function () {
            at += 1;
            next();
        });
    }

    next();
}

function listItem(id, value, sample, then) {
    var payload = {
        details: value.message,
        offers: +!!sample.data('listing_offers_url'), // value -> bool -> int
        buyout: sample.data('listing_buyout'),
        tradeoffer_url: sample.data('listing_offers_url'),
        'user-id': Page.csrfToken(),
        currencies: {
            metal: value.metal,
            keys: value.keys
        }
    };

    // id: current item id
    $.post("http://backpack.tf/classifieds/sell/" + id, payload, function (page) {
        var ok = /<div class="alert alert-dismissable alert-success">/.test(page),
        item = $('[data-id="' + id + '"]');

        item.css('opacity', 0.6).data('can_sell', 0)
            .find('.tag.bottom-right').html(ok ? '<i class="fa fa-tag"></i> ' + qlFormatValue(value, false) : '<i class="fa fa-exclamation-circle" style="color:red"></i>');

        if (then) then();
    });
}

function collectButtonValues() {
    var elems = $('.ql-button-values'),
    values = [];

    elems.each(function () {
        values.push(buttonValue($(this)));
    });

    return values;
}

function buttonValue(elem) {
    return {
        metal: +(Math.abs(parseFloat(elem.find('.ql-metal').val())).toFixed(2)) || 0,
        keys: Math.abs(parseInt(elem.find('.ql-keys').val(), 10)) || 0,
        message: elem.find('.ql-message').val() || ""
    };
}

function copyButtonValues(value, elem) {
    var i;

    for (i in value) {
        if (!value.hasOwnProperty(i)) continue;
        elem.find('.ql-' + i).val(value[i] || (i === "message" ? "" : "0"));
    }
}

function disableSelectionMode() {
    inventory.selectionMode = false;
    ITEM_POPOVERS_DISABLED = false;
};

function updateValues() {
    var li,
    totalkeys = 0,
    totalmetal = 0,
    curvalue = 0,
    marketvalue = 0,
    totalitems = 0;

    if (inventory.selectionMode) {
        li = $('.item:not(.spacer,.unselected):visible');
    } else {
        li = $('.item:not(.spacer):visible');
    }

    li.each(function () {
        // only count items
        totalitems++;
        curvalue = curvalue + parseFloat($(this).data('price'));

        if ($(this).data('market-p') && $(this).data('market-p') != -1) {
            marketvalue += $(this).data('market-p');
        }

        if ($(this).data('app') == 440) {
            switch ($(this).data('defindex')) {
                case 5000:
                    totalmetal += 0.111111;
                    break;

                case 5001:
                    totalmetal += 0.333333;
                    break;

                case 5002:
                    totalmetal++;
                    break;
            }
        }

        if ($(this).data('is-key')) {
            totalkeys++;
        }
    });

    if (totalmetal % 1 >= 0.9) {
        // If it's x.99, round up
        totalmetal = Math.round(totalmetal);
    }

    $('#keycount').html(totalkeys.format());
    $('#metalcount').html((Math.floor(totalmetal * 100) / 100).toFixed(2));
    $('#refinedvalue').html(Math.round(curvalue).format());
    $('#dollarvalue').html(Math.round(curvalue * rawValue).format());
    $('#marketvalue').html(Math.round(marketvalue / 100).format());
    $('#totalitems').html(totalitems.format());
};

function clearSelection() {
    if (inventory.selectionMode) {
        Page.selectItem($('.item'));
        disableSelectionMode();
        updateValues();
        updateClearSelectionState();
    }
};

function updateClearSelectionState() {
    if (inventory.selectionMode) {
        $('#clear-selection').removeClass('disabled');
    } else {
        $('#clear-selection').addClass('disabled');
    }
};

function modifyQuicklists() {
    var html =
        "<p>Add, edit, and remove quicklist presets here. Metal can have two decimals, keys must be integers (no decimals). If any value is missing, it is defaulted to 0, with the exception of the message, which then is empty.</p>" +
        "<div id='ql-button-listing'>";

    values.forEach(function (vals) {
        html += quicklistBtnHtml(vals.metal, vals.keys, vals.message);
    });
    html += "</div>" +
        '<a class="btn btn-default ql-add-button">Add</a>';

    Page.modal("Modify Quicklist Presets", html, '<a class="btn btn-default btn-primary ql-save-button">Save</a>');

    $('.ql-save-button').click(function () {
        values = collectButtonValues().filter(function (v) {
            return (v.metal || v.keys) && isFinite(v.metal) && isFinite(v.keys);
        });

        DataStore.setItem("bes-quicklists", JSON.stringify(values));
        Page.hideModal();
    });

    $('.ql-add-button').click(function () {
        $("#ql-button-listing").append(quicklistBtnHtml("", "", "", ""));
    });

    $('#ql-button-listing').on('click', '.ql-remove-button', function () {
        $(this).parent().remove();
    });
}

function addSelectPage() {
    var bp = inventory;
    function selectItems(items) {
        inventory.selectionMode = true;
        Page.selectItem(items);

        updateClearSelectionState();
        updateValues();
        updateSelectQuicklist();
    }

    $('#backpack').on('click', '.select-page', function () {
        var pageitems = $(this).closest('.backpack-page').find('.item').not('.spacer').filter(':visible');

        if (!pageitems.length) return;

        if (inventory.selectionMode) {
            if (pageitems.length === pageitems.not('.unselected').length) { // all == selected
                Page.unselectItem(pageitems);

                if ($('.item:not(.unselected)').length === 0) {
                    clearSelection();
                    updateSelectQuicklist();
                    updateValues();
                    return;
                }
            } else {
                selectItems(pageitems);
            }
        } else {
            Page.unselectItem($('.item'));
            selectItems(pageitems);
        }
    });
}

function addSelectPageButtons() {
    $('.page-number').each(function () {
        var $this = $(this),
        label = $this.find('.page-anchor'),
        sp;

        if (!label[0]) return;
        sp = $this.find('.select-page');

        if (sp.length) {
            return;
        }

        if (!$this.nextUntil('.page-number').not('.spacer').filter(':visible').length) return;
        label.after('<span class="btn btn-primary btn-xs pull-right select-page" style="margin-right: 2.7%;margin-top: -0.1%;">Select Page</span>');
    });
}

function addHooks() {
    $('#clear-selection').click(function () {
        if (!$(this).hasClass('disabled')) {
            updateSelectQuicklist();
        }
    });

    Script.exec(
            "var old_updateDisplay = window.backpack.updateDisplay;" +
            addSelectPageButtons +
            "window.backpack.updateDisplay = function () { old_updateDisplay.call(window.backpack); addSelectPageButtons(); }"
            );
}

function addItemShiftClick() {
    var $i = $('.item:not(.spacer)'),
    bp = inventory,
    $last, $select;

    Script.exec("$('.item:not(.spacer)').off('click');");
    $i.click(function (e) {
        var $this = $(this),
        $lidx;

        updateSelectQuicklist();

        if (!inventory.selectionMode) {
            $last = null;
            if ($this.siblings('.popover').length === 0) {
                // Touchscreen compatibility.
                // Makes it so a popover must be visible before selection mode can be activated.
                return;
            }

            inventory.selectionMode = true;
            Page.unselectItem($('.item'));
            Page.selectItem($this);
            $last = $this;

            updateClearSelectionState();
        } else {
            if ($this.hasClass('unselected')) {
                if (e.shiftKey && $last && $last.not('.unselected') && ($lidx = $i.index($last)) !== -1) {
                    e.preventDefault();
                    document.getSelection().removeAllRanges();

                    if ($lidx > $i.index($this)) {
                        $select = $last.prevUntil($this);
                    } else {
                        $select = $last.nextUntil($this);
                    }

                    $last = $this;
                    Page.selectItem($select.add($this));
                } else {
                    $last = $this;
                    Page.selectItem($this);
                }
            } else {
                $last = null;
                Page.unselectItem($this);

                if ($('.item:not(.unselected)').length === 0) {
                    inventory.selectionMode = false;
                    Page.selectItem($('.item'));
                    updateClearSelectionState();
                    updateValues();
                }
            }
        }

        $('#clear-selection').click(function () {
            if (!$(this).hasClass('disabled')) {
                disableSelectionMode();
            }
        });

        updateValues();
    });
}

function load() {
    addStyles();
    loadQuicklists();

    if (Page.isBackpack()) {
        addHooks();
        addSelectPage();
        addSelectPageButtons();
        addItemShiftClick();
    }

    if (!Page.isUserBackpack() || Page.appid() !== 440) return;

    addQuicklistPanelButtons();
    addEventListeners();
}

module.exports = load;
module.exports.modifyQuicklists = modifyQuicklists;



//End quicklist.js
