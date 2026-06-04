$(document).ready(function () {


    document.querySelectorAll('[data-slider-config]').forEach(slider => {
      const config = JSON.parse(slider.dataset.sliderConfig);

      if (!$(slider).hasClass('slick-initialized')) {
        $(slider).slick(config);
      }
    });

});

 $(document).on("click", ".el-play-button", function (e) {
     var video = jQuery(this).parents('.el-video-wrapper').find('video');
 if (jQuery(this).hasClass("active")) {
    jQuery(this).parents('.el-video-wrapper').removeClass('active');
     jQuery(this).removeClass('active');
 video.trigger('pause');
 } else {
 video.trigger('play');
   jQuery(this).parents('.el-video-wrapper').addClass('active');
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



$(document).on("click", ".el-question", function (e) {
  if (jQuery(this).hasClass("active")) {
    jQuery(this).toggleClass('active');
    jQuery(this).next().slideToggle();
  } else {
    jQuery('.el-question').removeClass('active');
    jQuery('.el-question').next().slideUp();
    jQuery(this).toggleClass('active');
    jQuery(this).next().slideToggle();
  }
});


$(document).on("click", "a[href='/#faq']", function (e) {
  const target = document.querySelector('.el-faq');

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

$(document).on("click", ".el-mobile-menu-button", function (e) {
    $('.el-drawer-menu').addClass('active');
    $('.el-drawer-menu-bg').show();
    $('body').addClass('el-overflow-hidden');
});
$(document).on("click", ".el-mobile-menu-close", function (e) {
    $('.el-drawer-menu').removeClass('active');
    $('.el-drawer-menu-bg').hide();
    $('body').removeClass('el-overflow-hidden');
});

$(document).on("click", ".el-drawer-menu-bg", function (e) {
    $('.el-drawer-menu').removeClass('active');
    $('.el-drawer-menu-bg').hide();
    $('body').removeClass('el-overflow-hidden');
});




$(document).on("click", ".el-element-option", function(e) {
$(this).parents('.el-product').find('.el-element-option').removeClass('active');
$(this).addClass('active');
var data_tab = $(this).attr('data_tab');
$(this).parents('.el-product').find('.el-quantity-data').hide();
$(this).parents('.el-product').find('.el-quantity-data[data_tab="'+data_tab+'"]').show();
});


$(document).on("click", ".el-sub-toggle.active", function(e) {
$(this).removeClass('active');
var sub_tab = 1;
$(this).parents('.el-product').find('.el-sub-tab').hide();
$(this).parents('.el-product').find('.el-sub-tab[sub_tab="'+sub_tab+'"]').show();
});

$(document).on("click", ".el-sub-toggle:not(.active)", function(e) {
$(this).addClass('active');
var sub_tab = 2;
$(this).parents('.el-product').find('.el-sub-tab').hide();
$(this).parents('.el-product').find('.el-sub-tab[sub_tab="'+sub_tab+'"]').show();
});











$(document).on("click", ".el-cart-button", function (e) {
    $('.el-cart-drawer').addClass('active');
    $('.el-drawer-cart-bg').show();
    $('body').addClass('el-overflow-hidden');
});
$(document).on("click", ".el-mobile-cart-close, .el-drawer-cart-bg, a[href='#close_cart']", function (e) {
  e.preventDefault();
    $('.el-cart-drawer').removeClass('active');
    $('.el-drawer-cart-bg').hide();
    $('body').removeClass('el-overflow-hidden');
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
    var newContent = $(response).find('.el-cart-drawer-js').html();
    $('.el-cart-drawer-js').html(newContent);
    $('.el-cart-drawer-js').removeClass('el-loading-cart');
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
      $('.el-cart-count').text(count);
      if (count > 0) {
        $('.el-cart-count').show();
      } else {
        $('.el-cart-count').hide();
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

      $('.el-cart-count').text(count);

      if (count > 0) {
        $('.el-cart-count').show();
      } else {
        $('.el-cart-count').hide();
      }

      return count;
    })
    .catch(err => console.error('Cart count error:', err));
}



$(document).on('click', '.el-cart-drawer-js .el-quantity-plus, .el-cart-drawer-js .el-quantity-minus', function () {
    $('.el-cart-drawer-js').addClass('el-loading-cart');
  var $btn = $(this);
  var $wrapper = $btn.closest('.el-line-item');
  var $input = $wrapper.find('.el-quantity-input');

  var key = $wrapper.data('key');
  var qty = parseInt($input.val());

  if ($btn.hasClass('el-quantity-plus')) {
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









$(document).on("click", '.el-atc-js', function (e) {
  e.preventDefault();
  var $btn = $(this).addClass('el-loading');
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
        $btn.removeClass('el-loading');
    refreshCartDrawer();
    $('.el-cart-drawer').addClass('active');
    $('.el-drawer-cart-bg').show();
    $('body').addClass('el-overflow-hidden');
      }, 500);
    }
  });
}
});







$(document).on('click', 'a[href="#upgrade"]', async function(e){

  e.preventDefault();
    $('.el-cart-drawer-js').addClass('el-loading-cart');
  var $lineItem = $('.el-without-sub');
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



$(document).on("click", ".el-remove-fake", function(e) {
$(this).parents('.el-line-item').find('.el-quantity-minus').trigger('click');
});