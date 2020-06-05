import $ from 'jquery';
import './lib/slick.min.js';
import "./lib/jquery.inview.js";
//import 'what-input';

window.jQuery = $;
$(".js-docs pre code").parent().each(function(){
    $(this).before('<p class="code"></p>');
    $(this).appendTo($(this).prev());
});
$(".js-docs .code").append('<button class="btn btn_clipboard-copy js-clipboard"></button>');
$('.js-docs > h1:first-child + ol, .js-docs > h2:first-child + ol, .js-docs > ol:first-child').each(function(){
    if($(this).find("li>a").length == $(this).find("a").length){
        const menu = $(this).parents('.js-docs').prev('.js-menu');
        $(this).find("li>a").each(function(){
            const link = $(this).attr("href");
            if(link.indexOf("#") == 0){
                if($(".js-docs " + link).index() < 0){
                    const text = $(this).text();
                    $('.js-docs').find('h1,h2,h3,h4,h5,h6').each(function(){
                        if($(this).text() == text){
                            $(this).attr('id', link.substring(1, link.length));
                            return false;
                        }
                    });
                }
                $('.js-docs ' + link).prepend('<span class="js-page-anchor"></span>');
            }
        });
        $(this).parents('.js-docs').after('<div class="sidebar-toc"></div>');
        $(this).addClass('toc-list js-toc-list js-menu');
        $(this).find("a").first().addClass('active');
        $(this).find("li").addClass('js-scroll-navigate');
        $(this).find('ol').addClass('js-menu');
        if($(this).prev()[0].nodeName.toLowerCase() == "h1" || $(this).prev()[0].nodeName.toLowerCase() == "h2"){
            $(this).prev().appendTo($(this).parents('.js-docs').next('.sidebar-toc'));
        }
        $(this).appendTo($(this).parents('.js-docs').next('.sidebar-toc'));
        if(menu){
            menu.find(".nav-link.active").last().parent().append($(this).clone().addClass('nav-item-toc')).prepend('<button class="nav-item-toggle js-toggle"></button>');
        }
    }
});
$(".js-docs table").each(function(){
    if ($(this).find("th").first().text().indexOf("#") == 0 && $(this).find("thead th").length == 3) {
        $(this).addClass('data-table');
        if($(this).find("th").first().text().length > 4){
            $(this).addClass("data-table_detailed");
        }
      //console.log("presumably a data table");
    }
});
$(document).ready(function(){
    $('.js-accordion dt, .js-toggle').on('click tap', function(){
        $($(this).data('target') ? $(this).data('target') : $(this)).toggleClass('active');
    });
    const setActiveMenuItem = function(){
        $(this).parents(".js-menu").first().removeClass("active");
        $(this).parents(".js-menu").first().find("a").removeClass("active");
        $(this).addClass("active");
        console.log($(this).text() + " activated");
    }
    $(".js-menu .js-scroll-navigate a").on("click tap", setActiveMenuItem);
    $('.js-slider').slick({
        dots: true,
        infinite: true,
        speed: 300,
        slidesToShow: 2,
        slidesToScroll: 1,
        responsive: [{
            breakpoint : 768,
            settings: {
                slidesToShow: 1,
                slidesToScroll: 1
            }
        }]
    });
    if($('.js-page-anchor').length > 1){
        let scrollupdate = true;
        $(".js-toc-list a").on('click tap', function(){
            scrollupdate = false;
            $(setTimeout(() => {
                scrollupdate = true;
            }, 300));
        });
        $('.js-page-anchor').on('inview', function(event, isInView){
            if(isInView && scrollupdate){
                $('.js-toc-list').each(function(){
                    if(event.target.id){
                        setActiveMenuItem.call(
                          $(this).find(
                            'a[href="#' + event.target.id + '"]'
                          )
                        );
                    }else{
                        setActiveMenuItem.call($(this).find(
                        'a[href="#' + event.target.parentNode.id + '"]'
                        ));
                    }
                });
            }
        });
    }
});

