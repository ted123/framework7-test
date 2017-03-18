'use strict';
// Let's register Template7 helper so we can pass json string in links
Template7.registerHelper( 'json_stringify', function ( context ) {
	return JSON.stringify( context );
});

// Initialize your app
var myApp = new Framework7( {
	'animateNavBackIcon'  : true,
	'template7Pages'      : true,
	'swipePanel'          :'right',
	'precompileTemplates' : true
} );

var gd = {
	'products' : {},
	'onCart'   : {
		'products' : {},
		'total'    : 0
	},
	'limit'  : 0,
	'offset' : 0,
	'query'  : {}
};

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
mainView.router.load( {
	'template'     : myApp.templates.pageLoader,
	'animatePages' : false,
	'reload'        : true
} );

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
	return str[ query.key ];
}

function objToArray ( obj ) {
	return Object.keys( obj || {} ).map( function ( key ) { 
		return obj[ key ]; 
	} );
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
	console.log( url[ query.key ] )
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
			myApp.alert( err );
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

	if ( myApp.getCurrentView().activePage.name !== 'checkout' ) {
		mainView.router.load( {
			'template' : myApp.templates.checkout,
			'context'  : {
				'subtotal' : gd.onCart.totalPrice,
				'total'    : ( Number( gd.onCart.totalPrice ) + 50 ).toFixed( 2 )
			},

			'reload' : true
		} );
	}
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
			myApp.alert( err );
		} );
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


function initView () {
	getCategories( loadSidebar );
}

initView();


function addToCart ( id ) {
	console.log( id )
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
		myApp.alert( 'Unfortunately you can only order the same product up to 100' );
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

