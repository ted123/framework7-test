'use strict';
// Let's register Template7 helper so we can pass json string in links
Template7.registerHelper( 'json_stringify', function ( context ) {
	return JSON.stringify( context );
});

Template7.registerHelper( 'formatCalendarDate', function ( context ) {
	return moment( new Date( context ) ).calendar();
});

Template7.registerHelper( 'formatDate', function ( context, options ) {
	return moment( new Date( context ) ).format( options.hash.format );
});

// Initialize your app
var myApp = new Framework7( {
	'animateNavBackIcon'  : true,
	'template7Pages'      : true,
	'swipePanel'          :'right',
	'precompileTemplates' : true,

	'preroute' : function ( view, page ) {
		if ( ( page.query || {} ).checkout && !gd.token ) {
			loadLogIn();
			gd.toCheckout = true;
			return false;
		} else if ( gd.toCheckout && gd.token ) {
			gd.toCheckout = false;
			loadCheckout();
		} else {
			gd.toCheckout = false;
		}
	} 
} );

var gd = {
	'products' : {},
	'onCart'   : {
		'products' : {},
		'total'    : 0
	},
	'transactions' : {},
	'limit'  : 0,
	'offset' : 0,
	'query'  : {}
};

function initGD () {
	gd = {
		'products' : {},
		'onCart'   : {
			'products' : {},
			'total'    : 0
		},
		'transactions' : {},
		'limit'  : 0,
		'offset' : 0,
		'query'  : {}
	};
}

var itemTpl         = '{{#each products.products}} {{#if this.count}} <div id="{{this._id}}-product" class="gd-product-card gd-border-red card"> {{else}} <div id="{{this._id}}-product" class="gd-product-card card"> {{/if}} <div class="product-image"> <img src="{{this.image}}" /> </div> <div class="product-description"> {{this.name}} </div> <div class="product-price"> ₱{{this.price}} </div> {{#if this.count}} <div id="{{this._id}}-atc" class="product-add-cart hidden" onClick="addToCart(\'{{this._id}}\')"> Add to Cart </div> <div id="{{this._id}}-control" class="gd-bg-red color-white product-control"> <div class="gd-control-col width-28" onClick="decreaseQuantity(\'{{this._id}}\')"> - </div> <div id="{{this._id}}-quantity" class="gd-control-col width-44 product-quantity"> {{this.count}} </div> <div class="gd-control-col width-28" onClick="increaseQuantity(\'{{this._id}}\')"> + </div> </div> {{else}} <div id="{{this._id}}-atc" class="product-add-cart" onClick="addToCart(\'{{this._id}}\')"> Add to Cart </div> <div id="{{this._id}}-control" class="gd-bg-red color-white product-control hidden"> <div class="gd-control-col width-28" onClick="decreaseQuantity(\'{{this._id}}\')"> - </div> <div id="{{this._id}}-quantity" class="gd-control-col width-44 product-quantity"> 1 </div> <div class="gd-control-col width-28" onClick="increaseQuantity(\'{{this._id}}\')"> + </div> </div> {{/if}} </div> {{/each}}'
var compiledItemTpl = Template7.compile( itemTpl );

myApp.onPageInit( 'categoryProducts', function ( page ) {
	if ( $$( '.gdrow > .card' ).length === gd.currentTotal ) {
		return;
	}

	var loading;

	$$( '.infinite-scroll' ).on( 'infinite', function () {
		if ( loading ) {
			return;
		} 
		loading = true;
		gd.query.offset += gd.query.limit;
		
		$$( '.infinite-scroll-preloader' ).removeClass( 'hidden' );
		
		getProducts( gd.query )
			.then( function ( products ) {
				var html = compiledItemTpl( { 'products' : products } )
				loading  = false;

				$$( '.gdrow' ).append( html );

				if ( $$( '.gdrow > .card' ).length === products.totalItems ) {
					myApp.detachInfiniteScroll( '.infinite-scroll' );
					$$( '.infinite-scroll-preloader' ).addClass( 'hidden' );
				}
			} )
			.catch( function ( err ) {
				gd.query.offset -= gd.query.limit;
				loading = false;
			} );
	} );
} );

myApp.onPageBeforeRemove( 'categoryProducts', function ( ) {
	myApp.detachInfiniteScroll( '.infinite-scroll' );
} );
// Export selectors engine
var $$ = Dom7;

// Add Views
var mainView = myApp.addView( '.view-main', {} );
var left     = myApp.addView( '.view-left', {} );
var right    = myApp.addView( '.panel-right', {} );

// show page loader while fetching data
function showLoadingPage () {
	mainView.router.load( {
		'template'     : myApp.templates.pageLoader,
		'animatePages' : false,
		'reload'        : true
	} );
}

function sort ( array, key ) {
	return ( array || [] ).sort( function( a, b ) {
   		if ( a[ key ] < b[ key ] ) return -1;
   		if ( a[ key ] > b[ key ] ) return 1;
    	return 0;
	} );
}

function constructQuery ( query ) {
	var str = {
		'category' : 'where=' + encodeURIComponent( query.where ) + '&'
		+ 'sort=' + encodeURIComponent( query.sort ) + '&'
		+ 'offset=' + encodeURIComponent( query.offset || 0 ) + '&'
		+ 'limit=' + encodeURIComponent( query.limit || 100 ),
		'name' : 'offset=' + encodeURIComponent( query.offset || 0 ) + '&'
		+ 'limit=' + encodeURIComponent( query.limit || 100 )
	}
	return str[ query.key || 'category' ];
}

function objToArray ( obj ) {
	return Object.keys( obj || {} ).map( function ( key ) { 
		return obj[ key ]; 
	} );
}

function jsonToFormData ( jsonData ) {
	return Object.keys( jsonData ).reduce( function ( formData, key ) {
		formData.append( key, jsonData[ key ] );
		return formData;
	}, new FormData() );
}

function getCategories ( callback ) {
	$$.ajax( {
		'dataType' : 'json',
		'url'      : 'http://52.34.60.86:3000/categories/GD:getCategories' ,
		
		'success' : function searchSuccess( res ) {
			callback( sort( res, 'categoryname' ) );
		},

		error : function searchError( xhr, err ) {
			( callback || function () {} )( null, err );
		}
	} );
}

function getProducts ( query ) {
	var url = {
		'category' : 'http://52.34.60.86:3000/products?' + constructQuery( query ),
		'name'     : 'http://52.34.60.86:3000/products/' + query.value + '?' + constructQuery( query )
	};

	return new Promise( function ( resolve, reject ) {
		$$.ajax( {
			'dataType' : 'json',
			'url'      : url[ query.key ],
			
			'success' : function searchSuccess( res ) {
				gd.products = res.products.reduce( function ( acc, item, i ) {
					if ( !acc[ item._id ] ) {
						acc[ item._id ] = item;
					} else {
						res.products[ i ] = acc[ item._id ];
					}

					return acc;
				}, gd.products );

				resolve( res );
			},

			error : function searchError( xhr, err ) {
				reject( err );
			}
		} );
	} );
}

function loadGDHomepage () {
	var homeData = gd.categories.map( function ( category ) {
		var query = {
			'value'  : category.categoryname,
			'key'    : 'category',
			'where'  : 'category=' + category.categoryname,
			'sort'   : 'popularity',
			'offset' : 0,
			'limit'  : 20
		};

		return getProducts( query );
	} );

	Promise
		.all( homeData )
		.then( function ( products ) {
			mainView.router.load( {
				'template'     : myApp.templates.homePage,
				'reload'       : true,
				'context' : {
					'categories' : gd.categories.map( function ( item, index ) {
						item.products = products[ index ];
						return item;
					} )
				}
			} );
		} )
		.catch( function ( err ) {
			myApp.alert( err, 'Grocery District' );
		} );
}

function loadSidebar ( categories ) {
	gd.categories = categories || [];

	left.router.load( {
		'template'     : myApp.templates.sideBarTpl,
		'animatePages' : false,
		'reload'       : true,
		'context'      : {
			'categories' : categories
		}
	} );

	loadGDHomepage();
}

function loadCart () {
	var totalPrice = 0;
	// show the product in the cart
	right.router.load( {
		'template'     : myApp.templates.cartTpl,
		'animatePages' : false,
		'reload'       : true,
		'context'      : {
			'products' : objToArray( gd.onCart.products ).map( function ( product ) {
				product.totalPrice = product.count * product.price;
				product.totalPriceText = product.totalPrice.toFixed( 2 );
				totalPrice += product.totalPrice;
				return product;
			} ),

			'totalPrice' : totalPrice.toFixed( 2 )
		}
	} );
}

function loadCheckout () {
	myApp.closePanel( true );

	if ( myApp.getCurrentView().activePage.name !== 'checkout' && gd.onCart.total ) {
		mainView.router.load( {
			'template' : myApp.templates.checkout,
			'context'  : {
				'subtotal' : gd.onCart.totalPrice,
				'total'    : ( Number( gd.onCart.totalPrice ) + 50 ).toFixed( 2 )
			},
			'query' : {
				'checkout' : true
			},
			'reload' : true
		} );
	}
}

function loadTransactions () {
	myApp.closePanel( true );

	var query = {
		'where' : 'userid=' + gd.user.id,
		'limit' : 5000,
		'sort'  : '-checkoutdate'
	};

	showLoadingPage();

	$$.ajax( {
		'dataType' : 'json',
		'url'      : 'http://52.34.60.86:3000/checkout?' + constructQuery( query ),

		'success' : function searchSuccess( res ) {
			gd.transactions = res.checkout.reduce( function ( acc, item, i ) {
				acc[ item._id ] = item;
				return acc;
			}, {} );

			mainView.router.load( {
				'template' : myApp.templates.transactions,
				'context'  : {
					'total'        : res.totalItems || 0,
					'transactions' : res.checkout || []
				},

				'reload' : true
			} );
		},

		error : function searchError( xhr, err ) {
			myApp.alert( 'An error occured. Try re-clicking transactions in the left navigation.', 'Grocery District' );
		}
	} );
}

function loadProducts ( value, key ) {
	
	var query = {
		'key'    : key,
		'value'  : value,
		'where'  : key + '=' + value,
		'sort'   : 'popularity',
		'offset' : 0,
		'limit'  : 10
	};
	
	myApp.closePanel( true );
	mainView.router.load( {
		'template' : myApp.templates.pageLoader,
		'reload'   : true
	} );

	getProducts( query )
		.then( function ( products ) {
			gd.query = query;
			gd.currentTotal = products.totalItems;
			mainView.router.load( {
				'template'     : myApp.templates.categoryProducts,
				'reload'   : true,
				'context' : {
					'category' : value,
					'products' : products
				}
			} );
		} )
		.catch( function ( err ) {
			myApp.alert( err, 'Grocery District' );
		} );
}

function loadOrderList ( id ) {
	var transaction = gd.transactions[ id ];
	var products    = [];

	myApp.popup( '.popup-loader' );

	var query = {
		'where' : '_id=' + transaction.items.toString(),
		'limit' : 5000
	};

	$$.ajax( {
		'dataType' : 'json',
		'url'      : 'http://52.34.60.86:3000/products?' + constructQuery( query ),
		'method'   : 'GET',

		'success' : function ( res ) {
			products = res.products.map( function ( item, index ) {
				item.count = transaction.quantity[ index ];
				item.price = transaction.itemprice[ index ];
				item.totalPriceText = ( item.count * item.price ).toFixed( 2 );

				return item;
			} );

			var html = myApp.templates.orderList( {
				'title'    : gd.transactions[ id ].checkoutdate,
				'products' : products
			} );

			$$( '#popup-loader-page' ).html( html );
		},

		'error' : function () {
			$$( '#popup-loader-text' ).removeClass();
			$$( '#popup-loader-text' ).text( 'An error occured. Try clicking the view order list button again.' );
		}
	} );
}

function signOut () {
	myApp.closePanel( true );
	var data = jsonToFormData( { 'token' : gd.token } );

	$$.ajax( {
		'dataType' : 'json',
		'url'      : 'http://grocerydistrict.ph/api/user/logout',
		'data'     : data,
		'method'   : 'POST'
	} );

	left.router.load( {
		'template'     : myApp.templates.sideBarTpl,
		'animatePages' : false,
		'reload'       : true,
		'context'      : {
			'categories' : gd.categories
		}
	} );

	gd.token = null;
	gd.user  = null;

	showLoadingPage();
	loadGDHomepage();
}

function signIn () {
	var data = jsonToFormData( myApp.formToJSON( '#sign-in-form' ) );

	$$( '#gd-sign-in-loader' ).removeClass( 'hidden' );
	$$( '#gd-sign-in-options' ).addClass( 'hidden' );
	$$.ajax( {
		'dataType' : 'json',
		'url'      : 'http://grocerydistrict.ph/api/login',
		'data'     : data,
		'method'   : 'POST',
		'success' : function searchSuccess( res ) {
			gd.user  = res.user;
			gd.token = res.token;

			left.router.load( {
				'template'     : myApp.templates.sideBarTpl,
				'animatePages' : false,
				'reload'       : true,
				'context'      : {
					'categories' : gd.categories,
					'name'       : gd.user.name,
					'token'      : gd.token
				}
			} );

			myApp.closeModal( '.login-screen', true);
		},

		'error' : function searchError( xhr, err ) {
			myApp.alert( 'Invalid email or password. Please try again.', 'Grocery District' );
		},

		'complete' : function () {
			$$( 'input[name=email]' ).val( '' );
			$$( 'input[name=password]' ).val( '' );
			$$( '#gd-sign-in-loader' ).addClass( 'hidden' );
			$$( '#gd-sign-in-options' ).removeClass( 'hidden' );
		}
	} );
}

function loadLogIn ( data ) {
	myApp.closePanel( true );
	myApp.loginScreen( '.login-screen', true);
}

function updateCart() {
	if ( gd.onCart.total ) {
		$$( '.cart-total' ).removeClass( 'hidden' );
		$$( '.cart-total' ).text( gd.onCart.total );
	} else {
		$$( '.cart-total' ).addClass( 'hidden' );
	}

	gd.onCart.totalPrice = objToArray( gd.onCart.products ).reduce( function ( acc, item ) {
		acc += item.count * item.price;
		return acc;
	}, 0 ).toFixed( 2 );

	$$( '.cart-total-price' ).text( '₱' + gd.onCart.totalPrice );
	$$( '.checkout-subtotal' ).text( '₱' + gd.onCart.totalPrice );
	$$( '.checkout-total' ).text( '₱' + ( Number( gd.onCart.totalPrice ) + 50 ) );
}

function resetProductData () {
	gd.products = {};
	gd.onCart   = {
		'products' : {},
		'total'    : 0 
	};

	updateCart();
	loadCart();
}

function submitCheckout () {
	var quantity  = [];
	var itemprice = [];
	var ids       = [];

	objToArray( gd.onCart.products ).map( function ( item, i ) {
		quantity[ i ]  = item.count;
		itemprice[ i ] = item.price;
		ids[ i ]       = item._id;

		return item;
	} );

	var data = {
		'items'        : ids,
		'quantity'     : quantity,
		'itemprice'    : itemprice,
		'notes'        : gd.checkoutData.get( 'notes' ),
		'expectedTime' : gd.checkoutData.get( 'expectedTime' ),
		'userid'       : gd.user.id
	};

	$$.ajax( {
		'dataType' : 'json',
		'url'      : 'http://52.34.60.86:3000/checkout/GD:checkout',
		'data'     : data,
		'method'   : 'POST',
		'success' : function ( res ) {
			resetProductData();
			loadTransactions();
			myApp.closeModal( '#checkout-overlay', false );
		},

		'error' : function ( xhr, err ) {
			myApp.alert( 'An error occured. Please try submitting the order again or check your network connection.', 'Grocery District' );
			myApp.closeModal( '#checkout-overlay', false );
		}
	} );
}

function closeCheckoutOverlay () {
	myApp.closeModal( '#checkout-overlay', false );
}

function checkVerificationCode ( code ) {
	var data = jsonToFormData( { 
		'token' : gd.token,
		'code'  : ( code || '' ).trim()
	} );

	$$.ajax( {
		'dataType' : 'json',
		'url'      : 'http://grocerydistrict.ph/api/validate/code',
		'data'     : data,
		'method'   : 'POST',
		'success' : function ( res ) {
			if ( res.status == 200 ) {
				submitCheckout();
			} else {
				myApp.prompt( 'Invalid code.<br/> Please try typing it again below.', 'Verification Code', checkVerificationCode, closeCheckoutOverlay );
			}
		},

		'error' : function ( xhr, err ) {
			myApp.alert( 'An error occured. Please try submitting the order again or check your network connection.', 'Grocery District' );
			myApp.closeModal( '#checkout-overlay', false );
		}
	} );
}

function sendVerificationCode () {
	var data = jsonToFormData( { 'token' : gd.token } );

	gd.checkoutData = jsonToFormData( myApp.formToJSON( '#checkout-info' ) );

	if ( !gd.checkoutData.get( 'notes' ) || !gd.checkoutData.get( 'expectedTime' ) ) {
		myApp.alert( 'Please fill in the notes and preferred time in "Other Information" section.', 'Grocery District' );
		return;
	}

	myApp.popup( '#checkout-overlay', false, false );

	$$.ajax( {
		'dataType' : 'json',
		'url'      : 'http://grocerydistrict.ph/api/send/confirmation',
		'data'     : data,
		'method'   : 'POST',
		'success' : function ( res ) {
			if ( res.status === 400  ) {
				myApp.alert( res.msg, 'Grocery District' );
				myApp.closeModal( '#checkout-overlay', false );
			} else {
				myApp.prompt( 'A new verification code has been sent to your email and phone number. Please place it below.', 'Verification Code', checkVerificationCode, closeCheckoutOverlay );
			}
		},

		'error' : function ( xhr, err ) {
			myApp.alert( 'An error occured. Please try submitting the order again or check your network connection.', 'Grocery District' );
			myApp.closeModal( '#checkout-overlay', false );
		}
	} );
}


function initView () {
	initGD();
	showLoadingPage();
	getCategories( loadSidebar );
}

initView();


function addToCart ( id ) {
	gd.products[ id ].count = 1;
	gd.onCart.total += 1;
	gd.onCart.products[ gd.products[ id ]._id ] = gd.products[ id ];

	$$( '#' + id + '-atc' ).addClass( 'hidden' );
	$$( '#' + id + '-control' ).removeClass( 'hidden' );
	$$( '#' + id + '-product' ).addClass( 'gd-border-red' );
	
	loadCart();
	updateCart();
}

function increaseQuantity ( id ) {
	var product = gd.onCart.products[ id ];

	gd.onCart.products[ id ].count += 1;

	if ( product.count > 100 ) {
		gd.onCart.products[ id ].count -= 1;
		myApp.alert( 'Unfortunately you can only order the same product up to 100', 'Grocery District' );
	} else {
		var totalPrice = product.count * product.price;
		gd.onCart.total += 1;
		$$( '#' + id + '-quantity' ).text( product.count );
		$$( '#' + id + '-cart-quantity' ).text( product.count );
		$$( '#' + id + '-total-price' ).text( '₱' + totalPrice.toFixed( 2 ) );
	}

	updateCart();
}

function decreaseQuantity ( id ) {
	var product = gd.onCart.products[ id ];

	gd.onCart.products[ id ].count -= 1;
	gd.onCart.total -= 1;

	if ( !product.count ) {
		delete gd.onCart.products[ id ];
		$$( '#' + id + '-atc' ).removeClass( 'hidden' );
		$$( '#' + id + '-control' ).addClass( 'hidden' );
		$$( '#' + id + '-product' ).removeClass( 'gd-border-red' );

		loadCart();
	} else {
		var totalPrice = product.count * product.price;
		$$( '#' + id + '-quantity' ).text( product.count );
		$$( '#' + id + '-cart-quantity' ).text( product.count );
		$$( '#' + id + '-total-price' ).text( '₱' + totalPrice.toFixed( 2 ) );
	}

	updateCart();
}

$$(document).on('submit', '.searchbar', function (e) { 
	var formData = myApp.formToJSON('.searchbar');
	loadProducts( formData.q, 'name' );
});

$$( '.popup-loader' ).on( 'popup:closed', function () {
	$$( '#popup-loader-page' ).html( '<span id="popup-loader-text" class="preloader preloader-red"></span>' );
} );

$$( document ).on( 'deviceready', function () {
	function exitApp () {
		navigator.app.exitApp();
	}

	function noop () {}

	document.addEventListener("backbutton", function () {
		myApp.confirm( 'Exiting the app will reset the items in cart. Are you sure you want to exit the app?', 'Grocery District', exitApp, noop );
		return false;
	}, false);
} );
