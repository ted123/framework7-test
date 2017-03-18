'use strict';
// Let's register Template7 helper so we can pass json string in links
Template7.registerHelper( 'json_stringify', function ( context ) {
	return JSON.stringify( context );
});

// Initialize your app
var myApp = new Framework7( {
	'animateNavBackIcon'  : true,
	'template7Pages'      : true,
	'swipePanel'          :'both',
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
				gd.products = res.products.reduce( function ( acc, item ) {
					if ( !acc[ item._id ] ) {
						acc[ item._id ] = item;
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

function initView () {
	getCategories( loadSidebar );
}

initView();


function addToCart ( id ) {
	gd.products[ id ].quantity = 1;
	gd.onCart.total += 1;
	gd.onCart.products[ gd.products[ id ]._id ] = gd.products[ id ];

	$$( '#' + id + '-atc' ).addClass( 'hidden' );
	$$( '#' + id + '-control' ).removeClass( 'hidden' );
	$$( '#' + id + '-product' ).addClass( 'gd-border-red' );

	$$( document ).trigger( 'gd:updateCart' );
}

function increaseQuantity ( id ) {
	gd.onCart.products[ id ].quantity += 1;

	if ( gd.onCart.products[ id ].quantity > 100 ) {
		gd.onCart.products[ id ].quantity -= 1;
		myApp.alert( 'Unfortunately you can only order the same product up to 100' );
	} else {
		gd.onCart.total += 1;
		$$( '#' + id + '-quantity' ).text( gd.onCart.products[ id ].quantity );
	}

	$$( document ).trigger( 'gd:updateCart' );
}

function decreaseQuantity ( id ) {
	gd.onCart.products[ id ].quantity -= 1;
	gd.onCart.total -= 1;

	if ( !gd.onCart.products[ id ].quantity ) {
		delete gd.onCart.products[ id ];
		$$( '#' + id + '-atc' ).removeClass( 'hidden' );
		$$( '#' + id + '-control' ).addClass( 'hidden' );
		$$( '#' + id + '-product' ).removeClass( 'gd-border-red' );
	} else {
		$$( '#' + id + '-quantity' ).text( gd.onCart.products[ id ].quantity );
	}

	$$( document ).trigger( 'gd:updateCart' );
}

$$( document ).on( 'gd:updateCart', function () {
	if ( gd.onCart.total ) {
		$$( '.cart-total' ).removeClass( 'hidden' );
		$$( '.cart-total' ).text( gd.onCart.total );
	} else {
		$$( '.cart-total' ).addClass( 'hidden' );
	}
} );

$$( '.panel-right' ).on( 'panel:open', function () {
	right.router.load( {
		'template'     : myApp.templates.cartTpl,
		'animatePages' : false,
		'reload'       : true,
		'context'      : {
			'products' : objToArray( gd.onCart.products ).map( function ( product ) {
				product.totalPrice = product.quantity * product.price;
				return product;
			} )
		}
	} );
} );

$$(document).on('submit', '.searchbar', function (e) { 
	var formData = myApp.formToJSON('.searchbar');
	myApp.alert( formData.q );
});

