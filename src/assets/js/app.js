import $ from 'jquery';
import './lib/slick.min.js';
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
        $(this).parents('.js-docs').after('<div class="sidebar-toc"></div>');
        $(this).addClass('toc-list js-toc-list js-menu');
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
$(document).ready(function(){
    $('.js-accordion dt, .js-toggle').on('click tap', function(){
        $($(this).data('target') ? $(this).data('target') : $(this)).toggleClass('active');
    });
    $('.js-menu .js-scroll-navigate a').on('click tap', function(){
        $(this).parents('.js-menu').first().removeClass('active');
        $(this).parents('.js-menu').first().find('a').removeClass('active');
        $(this).addClass('active');
    });
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
});

