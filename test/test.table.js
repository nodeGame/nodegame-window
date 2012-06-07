var util = require('util'),
    should = require('should');

// Requiring and exporting a window object (jsdom)
var	jsdom = require('./../node_modules/jsdom').jsdom,
	doc   = jsdom('<html><body></body></html>'),
	window = doc.createWindow();

module.exports.window = window;

// Requiring and exporting JSUS, NDDB
//var JSUS = require('./../node_modules/JSUS').JSUS,
//	NDDB = require('./../node_modules/NDDB').NDDB;
//
//module.exports.JSUS = JSUS;
//module.exports.NDDB = NDDB;
	
// Requiring and exporting nodeGame 
var node = require('./../node_modules/nodegame-client');

module.exports.node = node;

// Requiring and exporting GameWindow and HTMLRenderer
var	GameWindow = require('./../GameWindow.js'),
	HTMLRenderer = require('./../HTMLRenderer.js').HTMLRenderer;

node.window.HTMLRenderer = HTMLRenderer;

// TABLE    
var Table = require('./../Table.js').Table;

var clients = ['a','b','c','d'];
var states = [1,2,3,4];
var ids = ['z','x'];//['z','x','c','v'];

//To test 0 vs undefined

var hashable = [
   			 	{
   			 		painter: "Jesus",
   			 		title: "Tea in the desert",
   			 		year: 0,
   			 	},
                {
                    painter: "Dali",
                    title: "Portrait of Paul Eluard",
                    year: 1929,
                    portrait: true
                },
                {
                    painter: "Dali",
                    title: "Barcelonese Mannequin",
                    year: 1927
                },
                {
                    painter: "Monet",
                    title: "Water Lilies",
                    year: 1906
                },
                {
                    painter: "Monet",
                    title: "Wheatstacks (End of Summer)",
                    year: 1891
                },
                {
                    painter: "Manet",
                    title: "Olympia",
                    year: 1863
                },
                             
];

var not_hashable = [
                    {
                    	car: "Ferrari",
                       	model: "F10",
                       	speed: 350,
                   },
                   {
	                   	car: "Fiat",
	                   	model: "500",
	                   	speed: 100,
                   },
                   {
	                   	car: "BMW",
	                   	model: "Z4",
	                   	speed: 250,
                   },
];

var nitems = hashable.length + not_hashable.length;
var testcase = null;
var tmp = null;


var col1 = [hashable[0], hashable[1], hashable[2]],
	col2 = [hashable[3]],
	col3 = [hashable[4]];


var table;

describe('Table setup:', function() {
	before(function(){
		table = new Table();
	});
	
	it('length should be 0', function(){
		table.length.should.be.eql(0);
	});
	
	it('all pointers should be 0', function(){
		table.pointers.x.should.be.eql(0);
		table.pointers.y.should.be.eql(0);
		table.pointers.z.should.be.eql(0);
	});
	
});





describe('Table Operations:', function() {
	
	describe('Adding a column:', function() {
		before(function(){
			table = new Table();
			table.addColumn(col1);
		});
		
		it('length should be equal to column.length', function(){
			table.length.should.equal(col1.length);
		});
		
		it('#parse()', function() {
			table.parse();
//			table.table.childNodes.length.should.be.eql(col1.length);
//			console.log(table.table);
//			util.inspect(table.table);
			
//			for (var i in table.table.childNodes) {
//				if (table.table.childNodes.hasOwnProperty(i))
//					console.log(table.table.childNodes[i].innerHTML);
//					console.log('---------');
//			}
		});
		
	});
	
//	describe('Adding two extra columns:', function() {
//		table.addColumn(col2);
//		table.addColumn(col3);
//		
////		it('', function(){
////			db.get(1).should.equal(false);
////		});
//	});
 });


describe('Table and Hash:', function() {
	//var hashPainter = function(o) {
	//if (!o) return undefined;
	//return o.painter;
	//}
	//table.h('painter', hashPainter);
	
//	it('length should be 0', function(){
//		table.length.should.be.eql(0);
//	});
});


