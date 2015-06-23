var Prefs = require('./preferences'),
    Page = require('./page');

// Not a valid page, don't do anything
if (typeof unsafeWindow.$ !== 'function' || typeof unsafeWindow.$() === 'undefined') return;

Page.init();
require('./api').init();

Prefs
    .default('reptf', 'enabled', true)
    .default('quicklist', 'enabled', false)
    .default('pricetags', 'modmult', 0.5)
    .default('pricetags', 'tooltips', true)
    .default('changes', 'enabled', true)
    .default('changes', 'period', (1000 * 60 * 60 * 24)) // 1 day
    .default('pricing', 'step', EconCC.Disabled)
    .default('pricing', 'range', EconCC.Range.Mid)
    .default('lotto', 'show', true)
    .default('notifications', 'updatecount', 'click')
    .default('classifieds', 'signature', '')
    .default('classifieds', 'signature-buy', '')
    .default('classifieds', 'autoclose', true)
    .default('classifieds', 'autofill', 'default')
    .default('homebg', 'image', '')
    .default('homebg', 'repeat', 'no-repeat')
    .default('homebg', 'posy', 'top')
    .default('homebg', 'posx', 'center')
    .default('homebg', 'attachment', 'scroll')
    .default('homebg', 'sizing', 'contain')
    .default('other', 'originalkeys', false)
;

function exec(mod) {
    mod();
    mod.initialized = true;
}

if (Prefs.enabled('reptf')) exec(require('./components/reptf'));
exec(require('./components/quicklist')); // prefs checked inside main
exec(require('./components/pricetags'));
if (Prefs.enabled('changes')) exec(require('./components/changes'));
exec(require('./components/refresh'));
exec(require('./components/classifieds'));
exec(require('./components/prefs'));
exec(require('./components/search'));
exec(require('./components/dupes'));
exec(require('./components/improvements'));
exec(require('./components/users'));

require('./menu-actions').applyActions();
Page.addTooltips();

$(document).off('click.bs.button.data-api'); // Fix for bootstrap
Page.loaded = true;
