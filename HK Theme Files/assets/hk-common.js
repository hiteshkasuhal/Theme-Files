$(document).ready(function () {


    document.querySelectorAll('[data-slider-config]').forEach(slider => {
      const config = JSON.parse(slider.dataset.sliderConfig);

      if (!$(slider).hasClass('slick-initialized')) {
        $(slider).slick(config);
      }
    });

});

 $(document).on("click", ".hk-play-button", function (e) {
     var video = jQuery(this).parents('.hk-video-wrapper').find('video');
 if (jQuery(this).hasClass("active")) {
    jQuery(this).parents('.hk-video-wrapper').removeClass('active');
     jQuery(this).removeClass('active');
 video.trigger('pause');
 } else {
 video.trigger('play');
   jQuery(this).parents('.hk-video-wrapper').addClass('active');
     jQuery(this).addClass('active');
 }
 });



 
jQuery(document).ready(function(){
if(navigator.userAgent.indexOf('Mac') > 0) {
jQuery('body').addClass('mac-os');
} else {
jQuery('body').addClass('window-os');
}
});

$(window).on('scroll', function () {
  let scrollTop = $(this).scrollTop();

  if (scrollTop > 30) {
    $('body').addClass('remove_transparent');
  } else {
    $('body').removeClass('remove_transparent');
  }
});



$(document).on("click", ".hk-question", function (e) {
  if (jQuery(this).hasClass("active")) {
    jQuery(this).toggleClass('active');
    jQuery(this).next().slideToggle();
  } else {
    jQuery('.hk-question').removeClass('active');
    jQuery('.hk-question').next().slideUp();
    jQuery(this).toggleClass('active');
    jQuery(this).next().slideToggle();
  }
});


$(document).on("click", "a[href='/#faq']", function (e) {
  const target = document.querySelector('.hk-faq');

  if (target) {
    e.preventDefault();
    target.scrollIntoView({
      behavior: 'smooth'
    });
  }
  // else: do nothing → browser follows the link normally
});
$(document).on("click", "a[href='#reviews']", function (e) {
  e.preventDefault();
  document.querySelector('#reviews').scrollIntoView({
    behavior: 'smooth'
  })
});

$(document).on("click", ".hk-mobile-menu-button", function (e) {
    $('.hk-drawer-menu').addClass('active');
    $('.hk-drawer-menu-bg').show();
    $('body').addClass('hk-overflow-hidden');
});
$(document).on("click", ".hk-mobile-menu-close", function (e) {
    $('.hk-drawer-menu').removeClass('active');
    $('.hk-drawer-menu-bg').hide();
    $('body').removeClass('hk-overflow-hidden');
});

$(document).on("click", ".hk-drawer-menu-bg", function (e) {
    $('.hk-drawer-menu').removeClass('active');
    $('.hk-drawer-menu-bg').hide();
    $('body').removeClass('hk-overflow-hidden');
});




$(document).on("click", ".hk-element-option", function(e) {
$(this).parents('.hk-product').find('.hk-element-option').removeClass('active');
$(this).addClass('active');
var data_tab = $(this).attr('data_tab');
$(this).parents('.hk-product').find('.hk-quantity-data').hide();
$(this).parents('.hk-product').find('.hk-quantity-data[data_tab="'+data_tab+'"]').show();
});


$(document).on("click", ".hk-sub-toggle.active", function(e) {
$(this).removeClass('active');
var sub_tab = 1;
$(this).parents('.hk-product').find('.hk-sub-tab').hide();
$(this).parents('.hk-product').find('.hk-sub-tab[sub_tab="'+sub_tab+'"]').show();
});

$(document).on("click", ".hk-sub-toggle:not(.active)", function(e) {
$(this).addClass('active');
var sub_tab = 2;
$(this).parents('.hk-product').find('.hk-sub-tab').hide();
$(this).parents('.hk-product').find('.hk-sub-tab[sub_tab="'+sub_tab+'"]').show();
});











$(document).on("click", ".hk-cart-button", function (e) {
    $('.hk-cart-drawer').addClass('active');
    $('.hk-drawer-cart-bg').show();
    $('body').addClass('hk-overflow-hidden');
});
$(document).on("click", ".hk-mobile-cart-close, .hk-drawer-cart-bg, a[href='#close_cart']", function (e) {
  e.preventDefault();
    $('.hk-cart-drawer').removeClass('active');
    $('.hk-drawer-cart-bg').hide();
    $('body').removeClass('hk-overflow-hidden');
});









function removeShippingProtection() {
  var variantId = 53900035981639;

  $.getJSON('/cart.js', function (cart) {

    var hasProtection = false;
    var otherProductsTotal = 0;

      var count = 0;
    cart.items.forEach(function (item) {
count += item.quantity;
      if (item.variant_id == variantId) {
        hasProtection = true;
      } else {
        otherProductsTotal += item.final_line_price;
      }

    });

    // if protection exists AND all other products total is less than 1
    if (hasProtection && otherProductsTotal < 1) {

      $.ajax({
        url: '/cart/clear.js',
        type: 'POST',
        dataType: 'json',
        success: function () {
          refreshCartDrawer();
        },
        error: function () {
          refreshCartDrawer();
        }
      });

    }
    if (count> 0 && otherProductsTotal < 1) {
      $.ajax({
        url: '/cart/clear.js',
        type: 'POST',
        dataType: 'json',
        success: function () {
          refreshCartDrawer();
        },
        error: function () {
          refreshCartDrawer();
        }
      });

    }

  });

}




function refreshCartDrawer() {
  $.get(window.location.href, function (response) {
    var newContent = $(response).find('.hk-cart-drawer-js').html();
    $('.hk-cart-drawer-js').html(newContent);
    $('.hk-cart-drawer-js').removeClass('hk-loading-cart');
    updateCartCountExcludeShipping();
    removeShippingProtection();
  });
  
}

    removeShippingProtection();
    updateCartCountExcludeShipping();
function updateCartCount() {
  return fetch('/cart.js')
    .then(res => res.json())
    .then(cart => {
      var count = 0;
      cart.items.forEach(function (item) {
          count += item.quantity;
      });
      $('.hk-cart-count').text(count);
      if (count > 0) {
        $('.hk-cart-count').show();
      } else {
        $('.hk-cart-count').hide();
      }
      return count;
    })
    .catch(err => console.error('Cart count error:', err));
}



function updateCartCountExcludeShipping() {
  return fetch('/cart.js')
    .then(res => res.json())
    .then(cart => {

      var shippingVariantId = 53900035981639;

      var count = 0;

      cart.items.forEach(function (item) {
        // exclude shipping protection
        if (item.variant_id != shippingVariantId) {
          count += item.quantity;
        }
      });

      $('.hk-cart-count').text(count);

      if (count > 0) {
        $('.hk-cart-count').show();
      } else {
        $('.hk-cart-count').hide();
      }

      return count;
    })
    .catch(err => console.error('Cart count error:', err));
}



$(document).on('click', '.hk-cart-drawer-js .hk-quantity-plus, .hk-cart-drawer-js .hk-quantity-minus', function () {
    $('.hk-cart-drawer-js').addClass('hk-loading-cart');
  var $btn = $(this);
  var $wrapper = $btn.closest('.hk-line-item');
  var $input = $wrapper.find('.hk-quantity-input');

  var key = $wrapper.data('key');
  var qty = parseInt($input.val());

  if ($btn.hasClass('hk-quantity-plus')) {
    qty++;
  } else {
    qty--;
  }

  // update UI instantly
  $input.val(qty);

  // Shopify AJAX cart update
  $.ajax({
    url: '/cart/change.js',
    type: 'POST',
    data: {
      id: key,
      quantity: qty
    },
    dataType: 'json',
    success: function (cart) {
        refreshCartDrawer();
    },
    error: function (err) {
      console.error('Cart update failed', err);
    }
  });
});









$(document).on("click", '.hk-atc-js', function (e) {
  e.preventDefault();
  var $btn = $(this).addClass('hk-loading');
  var items = [];
  var variant_id =  $(this).attr('variant_id');
  var SHIPPING_VARIANT_ID = 53900035981639;
  var Item = {
    id: parseInt(variant_id),
    quantity: 1
  };
  items.push(Item);
  // Single call to /cart/add.js

 $.get('/cart.js')
    .done(function(cart) {

      var exists = false;

      if (cart && Array.isArray(cart.items)) {
        exists = cart.items.some(function(item) {
          return item.id == SHIPPING_VARIANT_ID;
        });
      }

      // -----------------------------
      // STEP 3: Add shipping protection if missing
      // -----------------------------
      if (!exists) {
        items.push({
          id: SHIPPING_VARIANT_ID,
          quantity: 1
        });
      }

      addToCart(items);
      

    })
    .fail(function() {
      // fallback: still proceed without check
      addToCart(items);
    });



  function addToCart(items) {
  $.ajax({
    type: 'POST',
    url: '/cart/add.js',
    data: JSON.stringify({
      items: items
    }),
    dataType: 'json',
    contentType: 'application/json',

    success: function () {

    },

    complete: function () {
      setTimeout(function () {
        $btn.removeClass('hk-loading');
    refreshCartDrawer();
    $('.hk-cart-drawer').addClass('active');
    $('.hk-drawer-cart-bg').show();
    $('body').addClass('hk-overflow-hidden');
      }, 500);
    }
  });
}
});







$(document).on('click', 'a[href="#upgrade"]', async function(e){

  e.preventDefault();
    $('.hk-cart-drawer-js').addClass('hk-loading-cart');
  var $lineItem = $('.hk-without-sub');
  var variant_id = $lineItem.attr('variant_id');
  var selling_plan = $lineItem.attr('selling_plan');
  var quantity = $lineItem.attr('quantity');
  var line_key = $lineItem.attr('data-key');
  try {

    // remove old item
    await fetch('/cart/change.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: line_key,
        quantity: 0
      })
    });

    // add upgraded subscription item
    await fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          id: parseInt(variant_id),
          quantity: parseInt(quantity),
          selling_plan: parseInt(selling_plan)
        },
          {
            id: 53900196479303,
            quantity: 1
          }]
      })
    });
    refreshCartDrawer();

  } catch(err) {
    console.log(err);
  }
});



$(document).on("click", ".hk-remove-fake", function(e) {
$(this).parents('.hk-line-item').find('.hk-quantity-minus').trigger('click');
});