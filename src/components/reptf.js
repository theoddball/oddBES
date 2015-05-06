/* global rep_gmp */
var Script = require('../script'),
    Cache = require('../cache'),
    Page = require('../page');

var bans = [],
    bansShown = false,
    cachePruneTime = 60 * 30 * 1000, // 30 minutes (in ms)
    banIssuers = ["steamBans", "opBans", "stfBans", "bzBans", "ppmBans", "bbgBans", "tf2tBans", "bptfBans", "srBans", "mctBans"],
    reptfSuccess = true,
    steamid, repCache;

function addMiniProfileButton() {
    function generateMiniProfile(element) {
        var profile = rep_gmp(element);

        profile.find('.stm-tf2outpost').parent().html('<i class=\"stm stm-tf2outpost\"></i> Outpost');
        profile.find('.stm-bazaar-tf').parent().html('<i class=\"stm stm-bazaar-tf\"></i> Bazaar');
        profile.find('.mini-profile-third-party').append(
            ' <a class=\"btn btn-default btn-xs\" target=\"_blank\" href=\"http://rep.tf/'+ element.attr('data-id')+'\">'+
            '<i class=\"fa fa-check-square\"></i> RepTF</a>'
        );
        return profile;
    }

    Script.exec('var rep_gmp = generateMiniProfile;'+
                'window.generateMiniProfile = ' + generateMiniProfile);
}

function showBansModal() {
    if (!bans.length) return;

    var html = "<b style='color:red'>User is banned on</b> ⋅ <a href='http://rep.tf/" + steamid + "' target='_blank'>rep.tf</a><br><br><ul>";
    bans.forEach(function (ban) {
        html += "<li><b>" + ban.name + "</b> - " + ban.reason + "</li>";
    });
    html += "</ul>";

    unsafeWindow.modal("rep.tf bans", html);
}

function addProfileButtons() {
    $('.btn > .stm-tf2outpost').parent().after(' <a class="btn btn-primary btn-xs" href="http://rep.tf/' + steamid + '" target="_blank"><i class="fa fa-check-square"></i> rep.tf</a>');
    $('small:contains(Community)').html('Community <a id="showrep" style="font-size: 14px; cursor: pointer;">+</a>');

    $('#showrep').on('click', function () {
        var $this = $(this),
            open = $this.text() === '+';

        if (open && !bansShown) {
            showBansModal();
            bansShown = true;
        }

        $this.text(open ? '-' : '+');
        $('.rep-entry').toggle(open);
    });
}

function addIssuers() {
    var groups = [];

    function spinner(name) {
        var id = name.replace(/\.|-/g, '').toLowerCase();
        groups.push(
            "<li id='" + id + "ban' class='rep-entry' style='display: none'><small>" + name + "</small>"+
            "<span class='label pull-right label-default rep-tooltip' data-placement='bottom'>"+
            "<i class='fa fa-spin fa-spinner'></i></span></li>"
        );
    }

    spinner("Outpost");
    spinner("Bazaar");
    spinner("Scrap.tf");
    spinner("PPM");
    // Uncomment to enable
    //spinner("TF2-Trader");
    //spinner("MCT");
    //spinner("BBG");
    $('.community-statii .stats li').last().after($(groups.join("")));
}

function checkBans() {
    var value;

    repCache = new Cache("bes-cache-reptf", cachePruneTime);
    value = repCache.get(steamid);

    if (value.update) {
        updateCache();
    } else {
        showBans(value.value);
    }
}

function compactResponse(json) {
    var compact = {success: json.success};

    banIssuers.forEach(function (issuer) {
        compact[issuer] = {banned: json[issuer].banned, message: json[issuer].message};
    });

    return compact;
}

function updateCache() {
    GM_xmlhttpRequest({
        method: "POST",
        url: "http://rep.tf/api/bans?str=" + steamid,
        onload: function (resp) {
            var json;

            try {
                json = compactResponse(JSON.parse(resp.responseText));
            } catch (ex) {
                json = {success: false};
            }

            reptfSuccess = json.success;
            repCache.set(steamid, json);
            if (json.success) repCache.save();

            showBans(json);
        }
    });
}

function addRepTooltips() {
    $('.rep-tooltip').tooltip({
        html: true,
        title: function () {
            return $(this).data('content');
        }
    });
}

function showBans(json) {
    function ban(name, obj) {
        var id = name.replace(/\.|-/g, '').toLowerCase(),
            status = $('#' + id + 'ban').find('.rep-tooltip');

        status.removeClass('label-default');

        if (reptfSuccess) {
            if (!obj.banned) return;

            if (obj.banned === "bad") {
                bans.push({name: name, reason: obj.message});
            }

            status.addClass("label-" + ({good: "success", bad: "danger"}[obj.banned]))
            .data('content', obj.message)
            .text({good: "OK", bad: "BAN"}[obj.banned]);
        } else {
            status.addClass("label-warning").data('content', "Ban status could not be retrieved.").text("ERR");
        }
    }

    ban("SteamRep", json.srBans);
    ban("Outpost", json.opBans);
    ban("Bazaar", json.bzBans);
    ban("Backpack.tf", json.bptfBans);
    ban("Scrap.tf", json.stfBans);
    ban("PPM", json.ppmBans);
    //ban("TF2-Trader", json.tf2tBans);
    //ban("MCT", json.mctBans);
    //ban("BBG", json.bbgBans);

    addRepTooltips();
    $('#showrep').css('color', reptfSuccess ? (bans.length ? '#D9534F' : '#5CB85C') : '#F0AD4E');
    //if (bans.length) $('body').append('<iframe src="https://youtube.com/embed/VlszRjKJqbA?autoplay=1&start=8&end=35" style="display:none;"></iframe>');
}

function load() {
    // Global
    addMiniProfileButton();

    // Profiles only
    if (!Page.isProfile()) return;
    steamid = Page.profileSteamID();

    addProfileButtons();
    addIssuers();
    checkBans();
}

module.exports = load;