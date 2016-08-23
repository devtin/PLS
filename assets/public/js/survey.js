$(document).ready(function() {
    var bdy         = $('body'),
        email       = $('input[name=email]').val(),
        platform    = $('input[name=platform]').val();

    function getFormVals(f) {
        f = f instanceof jQuery ? f : $(f);

        if (!f.length)
            return null;

        var r = {};

        f.find('input,textarea').each(function() {
            var $this = $(this);

            if ($this.attr('type') == 'radio' && !$this.prop('checked'))
                return;

            r[$this.attr('name')] = $this.val();
        });

        return r;
    }

    function sendRes(r,cb) {
        r.email = email;
        r.platform = platform;
        $.ajax({url:'/send',type:'post',data:r,complete:cb});
    }

    var s = $('.prompt,.answer');

    var btnGood     = $('.ask .btn-yes'),
        btnBad      = $('.ask .btn-no'),
        chgAns      = $('.change-answer'),
        c           = $('.container-main');

    $('form').on('submit',function(e) {
        e.preventDefault();
        e.stopPropagation();

        var $this = $(this);
        var btn = $this.find('button[type=submit]');

        var prevText = btn.text();
        btn.text('Wait...').prop('disabled',true);

        var d = getFormVals($this);
        d.doit = true;

        sendRes(d,function() {
            btn.text(prevText);
            btn.prop('disabled',false);
            s.removeClass('on');

            $('.thanks').addClass('on');
        });
    });

    if ('ontouchstart' in window) {
        bdy.addClass('touch');
    }

    btnGood.on('click',function() {
        s.removeClass('on');
        c.find('.answer.good').addClass('on');
        c.find('.answer.good form').find('input:visible,textarea:visible').eq(0).focus();
        sendRes(getFormVals(c.find('.answer.good form')));
    });

    btnBad.on('click',function() {
        s.removeClass('on');
        c.find('.answer.bad').addClass('on');
        c.find('.answer.bad form').find('input:visible,textarea:visible').eq(0).focus();
        sendRes(getFormVals(c.find('.answer.bad form')));
    });

    chgAns.on('click',function() {
        s.removeClass('on');
        c.find('.prompt').addClass('on');
    });
});