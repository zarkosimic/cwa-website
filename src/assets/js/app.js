import $ from 'jquery';
import faq from './components/faq';

window.jQuery = $;

(function(){

    faq.init();

    // smooth scrolling to anchor tag when clicking anchor link
    //$('a[href^="#"]').on('click', function (event) {
    //    event.preventDefault();
    //
    //    $('html, body').animate({
    //        scrollTop: $($.attr(this, 'href')).offset().top
    //    }, 600);
    //});
})();
