var Page = require('../page'),
    Prefs = require('../preferences'),
    Pricing = require('../pricing'),
    Script = require('../script');
var ec;

function modmults(e) {
    var paint = e.dataset.paintPrice,
        parts = [e.dataset['part-1Price'], e.dataset['part-2Price'], e.dataset['part-3Price']],
        bc = 0;

    if (paint) {
        bc += Pricing.fromBackpack(ec, paint).value;
    }

    if (parts[0] || parts[1] || parts[2]) {
        parts.forEach(function (part) {
            if (part) bc += Pricing.fromBackpack(ec, part).value;
        });
    }

    return bc;
}

function setupInst(next) {
    if (ec) return next();

    Pricing.ec(function (inst) {
        ec = inst;
        ec.currencies.metal.trailing = false;
        ec.currencies.earbuds.label = Prefs.pref('pricetags', 'earbuds');

        next();
    });
}

function applyTagsToItems(items) {
    var buds = Prefs.pref('pricetags', 'earbuds'),
        modmult = Prefs.pref('pricetags', 'modmult'),
        tooltips = Prefs.pref('pricetags', 'tooltips'),
        pricedef = Pricing.default(),
        clear = false;

    items.each(function () {
        var $this = $(this),
            listing = $this.attr('data-listing-steamid'),
            price = listing ? Pricing.fromListing(ec, $this.attr('data-listing-price')) : Pricing.fromBackpack(ec, $this.attr('data-p-bptf')),
            value = price.value,
            currency = price.currency,
            eq = $this.find('.equipped'),
            et = eq.text(),
            bud = !buds && /bud/.test(et),
            mults = 0,
            f, o, s;

        if (!listing) {
            mults = modmults(this);
            if (mults !== 0) {
                value += mults * modmult;

                clear = true;
                $this.attr('data-price', value);
            }

            if (mults || !pricedef) {
                clear = true;
                $this.attr('data-price', value);
            }
        }

        value = ec.convertFromBC(value, currency);

        o = {value: value || 0.001, currency: currency};
        if (/bud/.test(currency)) {
            o = ec.convertToCurrency(value, currency, 'keys');
        }

        if (listing) s = {step: EconCC.Disabled};
        else s = {};

        if (bud || mults || !pricedef) {
            // Disable step for listings
            ec.scope(s, function () {
                var di = $this.attr('data-defindex');

                ec.currencies.keys.round = listing ? 2 : 1;

                // Exception for keys and earbuds
                if (di === '5021' || di === '143') f = ec.formatCurrency(o);
                else f = ec.format(o, EconCC.Mode.Label);
            });

            eq.html((listing ? '<i class="fa fa-tag"></i> ' : '~') + f);
        }

        if (tooltips && /key|bud/.test(currency)) {
            ec.scope(s, function () {
                eq.attr('title', ec.format(o, EconCC.Mode.Long)).attr('data-suite-tooltip', '').addClass('pricetags-tooltip');
            });
        }
    });

    // Clear price cache for calculateValue()
    if (clear && unsafeWindow.calculateValue) {
        Script.exec('$("' + items.selector + '").removeData("price");');
        unsafeWindow.calculateValue();
    }

    if (tooltips) {
        Page.addTooltips($('.pricetags-tooltip'));
    }
}

function applyTagsToAvg(avg) {
    if (!Prefs.pref('pricetags', 'earbuds')) {
        ec.currencies.keys.round = 1;
        // /unusuals, /effects
        avg.each(function () {
            var $this = $(this),
                value = ec.convertToCurrency($this.attr('data-price'), 'metal', 'keys');

            $this.find('.equipped').text('avg ' + ec.formatCurrency(value));
        });
    }
}

function enabled() {
    return Page.appid() === 440 && (
        Prefs.pref('pricetags', 'earbuds') !== true ||
        Prefs.pref('pricetags', 'modmult') !== 0.5 ||
        Prefs.pref('pricetags', 'tooltips') !== false ||
        !Pricing.default()
    );
}

function load() {
    var items, avg;

    if (!enabled()) return;

    items = $('.item[data-p-bptf-all]:not([data-vote])');
    avg = $('[data-classes]');

    if (!items.length && !avg.length) return;

    setupInst(function () {
        applyTagsToItems(items);
        applyTagsToAvg(avg);
    });
}

module.exports = load;

module.exports.setupInst = setupInst;
module.exports.applyTagsToItems = applyTagsToItems;
module.exports.enabled = enabled;