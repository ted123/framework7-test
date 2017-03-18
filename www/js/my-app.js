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
	}
};

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
	return 'where=' + encodeURIComponent( query.where ) + '&'
		+ 'sort=' + encodeURIComponent( query.sort ) + '&'
		+ 'offset=' + encodeURIComponent( query.offset || 0 ) + '&'
		+ 'limit=' + encodeURIComponent( query.limit || 100 );
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
	return new Promise( function ( resolve, reject ) {
		$$.ajax( {
			'dataType' : 'json',
			'url'      : 'http://52.34.60.86:3000/products?' + constructQuery( query ),
			
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
			}
		} );
	}
}

function loadCategoryProducts ( category ) {
	var query = {
		'where'  : 'category=' + category,
		'sort'   : 'popularity',
		'offset' : 0,
		'limit'  : 50
	};
	
	myApp.closePanel( true );
	mainView.router.load( {
		'template' : myApp.templates.pageLoader,
		'reload'   : true
	} );

	getProducts( query )
		.then( function ( products ) {
			mainView.router.load( {
				'template'     : myApp.templates.categoryProducts,
				'reload'   : true,
				'context' : {
					'category' : category,
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

$$( '.panel-right' ).on( 'panel:open', function () {
	
} );

$$(document).on('submit', '.searchbar', function (e) { 
	var formData = myApp.formToJSON('.searchbar');
	myApp.alert( formData.q );
});

