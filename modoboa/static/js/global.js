/*
 * Global javascript utilities
 */

var static_url = "";

/*
 * A simple function to initialize the value of the global variable
 * 'media_url' (corresponding to django's MEDIA_URL variable).
 */
function set_static_url(url) {
    static_url = url;
}

/*
 * Shortcut function that construct an url from the media_url and the
 * given value.
 */
function get_static_url(value) {
    return static_url + value;
}

function modalbox(e, css, defhref, defcb, defclosecb) {
    e.preventDefault();
    var $this = $(this);
    var href = (defhref != undefined) ? defhref : $this.attr('href');
    var modalcb = (defcb != undefined) ? defcb : $this.attr('modalcb');
    var closecb = (defclosecb != undefined) ? defclosecb : $this.attr("closecb");

    if (href.indexOf('#') == 0) {
        $(href).modal('open');
        return;
    }
    $.ajax({
        type: "GET",
        url: href
    }).done(function(data) {
        var $div = $('<div />', {
            id: "modalbox", 'class': "modal", html: data
        });

        $div.modal({show: false});
        $div.one('shown', function() {
            $(".help").popover({
                container: "#modalbox",
                trigger: "hover"
            }).click(function(e) {e.preventDefault();});
            if (modalcb != undefined) {
                if (typeof modalcb === "function") modalcb(); else eval(modalcb + '()');
            }
        }).on('hidden', function(e) {
            var $target = $(e.target);

            if (!$target.is($(this))) {
                return;
            }
            $("#modalbox").remove();
            if (closecb != undefined) {
                if (typeof closecb === "function") closecb(); else eval(closecb + '()');
            }
        });
        $div.modal('show');

        if (css != undefined) {
            $div.css(css);
        }
    });
}

function modalbox_autowidth(e) {
    modalbox.apply(this, [e, {
        width: 'auto',
        'margin-left': function() { return -($(this).width() / 2); }
    }]);
}

/*
 * Simple shorcut do create a bootstrap alert box (error mode)
 */
function build_alert_box(msg, level) {
    return $('<div class="alert alert-' + level + '"> \
<a class="close" data-dismiss="alert" href="#">&times;</a>' + msg + "</div>");
}

function build_error_alert(msg) {
    return build_alert_box(msg, 'error');
}

function build_success_alert(msg) {
    return build_alert_box(msg, 'success');
}


/*
 * '.keys()' method support for old browsers :p
 */
if (!Object.keys) {
    Object.keys = function (obj) {
        var keys = [],
            k;
        for (k in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) {
                keys.push(k);
            }
        }
        return keys;
    };
}

/*
 * Clean all errors in a given form.
 */
function clean_form_errors(formid) {
    $("#" + formid + " div.error").removeClass("error");
    $("#" + formid + " span.help-inline").remove();
}

/*
 * Display validation errors for a given form.
 */
function display_form_errors(formid, data) {
    clean_form_errors(formid);
    $.each(data.form_errors, function(id, value) {
        var fullid = "id_" + (data.prefix ? data.prefix + "-" : "") + id;
        var $widget = $("#" + formid + " #" + fullid);
        var spanid = fullid + "-error";
        var $span = $("#" + spanid);

        if (!$widget.parents(".control-group").hasClass("error")) {
            $widget.parents(".control-group").addClass("error");
        }
        if (!$span.length) {
            $span = $("<span />", {
                "class": "help-inline",
                "html": value[0],
                "id": spanid
            });
            $widget.parents(".controls").append($span);
        } else {
            $span.html(value[0]);
        }
    });
}

/*
 * Simple function that sends a form using an 'ajax' post request.
 *
 * The function is intended to be used in a modal environment.
 */
function simple_ajax_form_post(e, options) {
    e.preventDefault();
    var $form = (options.formid != undefined) ? $("#" + options.formid) : $("form");
    var defaults = {reload_on_success: true, reload_mode: 'full', modal: true};
    var opts = $.extend({}, defaults, options);
    var args = $form.serialize();

    if (options.extradata != undefined) {
        args += "&" + options.extradata;
    }
    $.ajax({
        type: "POST",
        global: false,
        url: $form.attr("action"),
        data: args
    }).done(function(data) {
        if (opts.modal) {
            $("#modalbox").modal('hide');
        }
        if (opts.success_cb != undefined) {
            opts.success_cb(data);
            return;
        }
        if (opts.reload_on_success) {
            if (opts.reload_mode == 'full') {
                window.location.reload();
            } else {
                histomanager.update(true);
            }
        }
        if (data) {
            $("body").notify('success', data, 2000);
        }
    }).fail(function(jqxhr) {
        var data = $.parseJSON(jqxhr.responseText);
        if (data.form_errors) {
            display_form_errors(options.formid, data);
        } else {
            if (opts.modal) {
                $('.modal-body').prepend(build_error_alert(data));
            } else {
                $('body').notify('error', data);
            }
        }
        if (opts.error_cb) {
            opts.error_cb(data);
        }
    });
}

/*
 * The following code prevents a bug under IE7 because fullpath is
 * returned instead of a relative one. (even if mootools uses
 * getAttribute("href", 2), this is not working for AJAX requests)
 */
function gethref(obj) {
    var url = $(obj).attr("href");
    var re = new RegExp("^(https?):");
    var scheme = re.exec(url);

    if (scheme != null) {
        var baseurl = scheme[0] + "://" + location.host + location.pathname;
        return url.replace(baseurl, "");
    }
    return url;
};

/*
 * Extract the current URL parameters into a dictionnary.
 *
 * Ref:
 * http://stackoverflow.com/questions/901115/get-query-string-values-in-javascript
 */
function parse_qs(raw) {
    if (raw == "") return {};
    var res = {};

    for (var i = 0; i < raw.length; i++) {
        var p = raw[i].split('=');

        if (p.length != 2) continue;
        res[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return res;
}

/*
 * Extract a specific URL parameter using its name.
 *
 * Ref: http://stackoverflow.com/questions/901115/get-query-string-values-in-javascript
 */
function get_parameter_by_name(url, name) {
    var name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(url);

    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

/*
 * Return the target associated to an event object.
 */
function get_target(e, tag) {
    var $target = $(e.target);

    if (tag === undefined || $target.is(tag)) {
        return $target;
    }
    return $target.parent();
}

/*
 * Send a simple AJAX request.
 */
function simple_ajax_request(e, uoptions) {
    var $this = $(this);
    var defaults = {};
    var options = $.extend({}, defaults, uoptions);

    if (e != undefined) e.preventDefault();
    $.ajax({
        url: $this.attr("href"),
        dataType: 'json'
    }).done(function(data) {
        if (options.ok_cb) options.ok_cb(data);
        if (data) {
            $("body").notify("success", data, 2000);
        }
    });
}

/*
 * Simple function that redirect ajax requests to the login page if
 * the status code received with a response is equal to 278.
 */
function ajax_login_redirect(xhr) {
    if (xhr.status != 278) {
        return;
    }
    var params = "?next=" + window.location.pathname;

    window.location.href =
        xhr.getResponseHeader("Location").replace(/\?.*$/, params);
}

function activate_widget(e) {
    var $this = $(this);
    var widget_id = $this.attr("id").substr(0, $this.attr("id").length - 4);
    var $widget = $('#' + widget_id);

    if ($this.prop("checked")) {
        $widget.attr('disabled', true);
    } else {
        $widget.attr('disabled', false);
    }
}

/*
 * Default error handler for AJAX requests.
 */
function default_ajax_error_handler(event, jqxhr, settings) {
    try {
        var data = $.parseJSON(jqxhr.responseText);
    } catch (x) {
        var data = gettext("Internal error");
    }
    $('body').notify('error', data);
}

$(document).ready(function() {
    $(document).ajaxSuccess(function(e, xhr, settings) { ajax_login_redirect(xhr); });
    $(document).ajaxError(default_ajax_error_handler);
    $(document).on('click', 'a[data-toggle="ajaxmodal"]', modalbox);
    $(document).on('click', 'a[data-toggle="ajaxmodal-autowidth"]', modalbox_autowidth);
    $(document).on('click', '.activator', activate_widget);
    $(".help").popover({trigger: 'hover'}).click(function(e) {e.preventDefault();});
});
