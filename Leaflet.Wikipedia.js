L.Wikipedia = L.FeatureGroup.extend({
	options: {
		urlTemplate: 'http://dbpedia.org/sparql/?query={query}&format={format}&default-graph-uri={defaultGraphUri}',
		queryTemplate: 'SELECT DISTINCT {select} WHERE {{res} FILTER (({filter}) AND {language})} Limit {limit}',
		marker: {},
		query: {
			fields: ['label', 'lat', 'lng', 'abstract', 'link', 'thumbnail', 'types'],
			limit:  1000		
		},
		params: {
			format: 'json',
			defaultGraphUri: 'http://dbpedia.org', // ???			
		},
		fields: {
			abstract: [
				"?abstract",
				"?res <http://dbpedia.org/ontology/abstract> ?abstract."
			],
			label: [
				"(str(?label) as ?label)",
				"?res rdfs:label ?label." 
			],
			lat: [
				"?lat",
				"?res <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?lat."
			],
			link: [
				"?link",
				"?res foaf:isPrimaryTopicOf ?link."
			],
			lng: [
				"?lng",
				"?res <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?lng."
			],
			thumbnail: [
				"?thumbnail",
				"?res <http://dbpedia.org/ontology/thumbnail> ?thumbnail."
			],
			types: [
				"(GROUP_CONCAT(?type; separator=',') as ?types)",
				"?res rdf:type type_url. ?type_url rdfs:label ?type." // Needed?
			] 
		}	
	},

	initialize: function (options) {
		options = options || {};

		if (typeof options.query !== 'string') {
			options.query = L.extend({
				select:   L.bind(this._getFields, this, 0),
				res:      L.bind(this._getFields, this, 1),
				filter:   L.bind(this._getFilter, this),
				lang:     L.bind(this._getLanguage, this)					
			}, this.options.query, options.query);
		}

		if (typeof options.fields !== 'string') {
			options.fields = L.extend(this.options.fields, options.fields);
		}		

		L.setOptions(this, options);	
		L.FeatureGroup.prototype.initialize.call(this);
	},

	onAdd: function (map) {
		this._load(this._getUrl(), L.bind(this._parse, this));
		L.FeatureGroup.prototype.onAdd.call(this, map);
	},

	_getUrl: function (query) {
		return L.Util.template(this.options.urlTemplate, L.extend({
			query: this._getQuery(query)
		}, this.options.params));
	},

	_getQuery: function (query) {
		var options = this.options;
		if (typeof query === 'string') {
			return query;
		} else if (options.query === 'string') {
			return options.query;
		} else { 
			return L.Util.template(options.queryTemplate, L.extend({}, options.query, query));
		}
	},

	_load: function (url, callback) {
		console.log(url);

		/*
		reqwest({
			url: url,
			type: 'jsonp', 
			success: function (data) {
				//console.log("data", data);
				if (data.results && data.results.bindings) {
					callback(data.results.bindings);
				}

			}
		});
*/
	},

	_parse: function (items) {
		//console.log("parse", items);

		for (var i = 0, len = items.length; i < len; i++) {
			var data   = this._simplify(items[i]),
				marker = L.marker([data.lat, data.lng], this.options.marker);

			marker.data = data;

			this.addLayer(marker);
			//console.log(item);
		}	
	},

	_getFields: function (pos, data) {
		var fields = this.options.query.fields,
			str    = '';

		for (var i = 0, len = fields.length; i < len; i++) {
			str += this.options.fields[fields[i]][pos] + ' ';
		}

		return str;
	},

	_getFilter: function (data) {
		var query = this.options.query;
		if (query.bounds) {
			return this._getBoundsFilter(query.bounds);
		}
		return '';
	},

	_getBoundsFilter: function (latLngBounds) {
		latLngBounds = L.latLngBounds(latLngBounds);
		return L.Util.template('(?lng>{west} AND ?lng<{east} AND ?lat>{south} AND ?lat<{north})', {
			south: latLngBounds.getSouth(),
			west:  latLngBounds.getWest(),
			north: latLngBounds.getNorth(),
			east:  latLngBounds.getEast()
		});

	},

	_getLanguage: function () {
		return "LANG(?label)='en' AND LANG(?abstract)='en' AND LANG(?type)='en'";
	},

	_simplify: function (data) {
		for (var key in data) {
			if (data.hasOwnProperty(key)) {
				data[key] = data[key].value;
			}
		}
		return data;
	}

});

L.wikipedia = function (options) {
	return new L.Wikipedia(options);
};

/*

http://dbpedia.org/sparql/?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=SELECT%20DISTINCT%20%28str%28%3Flabel%29%20as%20%3Flabel%29%20%3Flng%20%3Flat%20%3Fabstract%20%3Flink%20%3Fthumbnail%20%20%28GROUP_CONCAT%28%3Ftype%3B%20separator%3D%27%2C%27%29%20as%20%3Ftypes%29%20%20WHERE%20%7B%20%20%20%20%20%20%20%3Fres%20%3Chttp%3A//www.w3.org/2003/01/geo/wgs84_pos%23long%3E%20%3Flng.%20%20%20%20%20%20%20%3Fres%20%3Chttp%3A//www.w3.org/2003/01/geo/wgs84_pos%23lat%3E%20%3Flat.%20%20%20%20%20%20%20%3Fres%20rdfs%3Alabel%20%3Flabel%20.%20%20%20%20%20%20%20%3Fres%20foaf%3AisPrimaryTopicOf%20%3Flink.%20%20%20%20%20%20%20%3Fres%20%3Chttp%3A//dbpedia.org/ontology/thumbnail%3E%20%3Fthumbnail.%20%20%20%20%20%20%20%3Fres%20%3Chttp%3A//dbpedia.org/ontology/abstract%3E%20%3Fabstract.%20%20%20%20%20%20%3Fres%20rdf%3Atype%20%20%3Ftype_url%20.%20%20%20%20%20%20%3Ftype_url%20rdfs%3Alabel%20%3Ftype%20.%20%20%20%20%20%20FILTER%20%28%28%3Flng%20%3E%204.1363525390625%20%20AND%20%3Flng%20%3C%207.808532714843749%20%20%20%20%20%20AND%20%3Flat%20%3E%2059.0405546167585%20AND%20%3Flat%20%3C%2059.73148471584178%29%20AND%20%20%20%20%20%20%20LANG%28%3Flabel%29%3D%27en%27%20AND%20%20%20%20%20%20LANG%28%3Fabstract%29%3D%27en%27%20%20%20%20%20%20AND%20LANG%28%3Ftype%29%3D%27en%27%29%20%20%7D%20Limit%201000&format=json



SELECT DISTINCT (str(?label) as ?label) ?lng ?lat ?abstract ?link WHERE { ?res <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?lng. ?res <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?lat. ?res rdfs:label ?label. ?res foaf:isPrimaryTopicOf ?link. ?res <http://dbpedia.org/ontology/abstract> ?abstract. FILTER ((?lng > 4.1363525390625 AND ?lng < 7.808532714843749 AND ?lat > 59.0405546167585 AND ?lat < 59.73148471584178) AND LANG(?label)='en' AND LANG(?abstract)='en') } Limit 1000

SELECT DISTINCT (str(?label) as ?label) ?lng ?lat ?abstract ?link ?thumbnail  
(GROUP_CONCAT(?type; separator=',') as ?types)  
WHERE {       
	?res <http://www.w3.org/2003/01/geo/wgs84_pos#long> ?lng.       
	?res <http://www.w3.org/2003/01/geo/wgs84_pos#lat> ?lat.       
	?res rdfs:label ?label .       
	?res foaf:isPrimaryTopicOf ?link.       
	?res <http://dbpedia.org/ontology/thumbnail> ?thumbnail.       
	?res <http://dbpedia.org/ontology/abstract> ?abstract.      
	?res rdf:type  
	?type_url .     
	?type_url rdfs:label ?type .      

	FILTER ((
		?lng > 4.1363525390625  AND 
		?lng < 7.808532714843749 AND 
		?lat > 59.0405546167585 AND 
		?lat < 59.73148471584178) AND       
	
		LANG(?label)='en' AND LANG(?abstract)='en' AND LANG(?type)='en'
	)  
} Limit 1000

*/