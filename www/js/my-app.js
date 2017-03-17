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

var gd = {};

// Export selectors engine
var $$ = Dom7;

// Add Views
var mainView = myApp.addView( '.view-main', {} );
var left  = myApp.addView( '.view-left', {} );

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

$$(document).on('submit', '.searchbar', function (e) { 
	var formData = myApp.formToJSON('.searchbar');
	myApp.alert( formData.q );
});

