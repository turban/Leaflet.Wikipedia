L.Wikipedia = L.FeatureGroup.extend({
	options: { // AND {language}
		urlTemplate: 'http://dbpedia.org/sparql/?default-graph-uri={defaultGraphUri}&query={query}&format={format}',
		queryTemplate: "SELECT DISTINCT {select} WHERE {{res} FILTER ({filter} {lang})} Limit {limit}",		
		marker: {},
		query: {
			fields: ['label', 'lat', 'lng', 'abstract', 'link', 'thumbnail', 'types'],
			limit:  1000,
			language: 'en'		
		},
		params: {
			format: 'json',
			defaultGraphUri: 'http://dbpedia.org', // ???			
		},
		fields: {
			abstract: [
				"?abstract",
				"?res <http://dbpedia.org/ontology/abstract> ?abstract.",
				true // true if translateable
			],
			label: [
				"(str(?label) as ?label)",
				"?res rdfs:label ?label.",
				true 
			],
			lat: [
				"?lat",
				"?res <http://www.w3.org/2003/01/geo/wgs84_pos%23lat> ?lat."
			],
			link: [
				"?link",
				"?res foaf:isPrimaryTopicOf ?link."
			],
			lng: [
				"?lng",
				"?res <http://www.w3.org/2003/01/geo/wgs84_pos%23long> ?lng."
			],
			thumbnail: [
				"?thumbnail",
				"?res <http://dbpedia.org/ontology/thumbnail> ?thumbnail."
			],
			type: [
				"(GROUP_CONCAT(?type; separator=',') as ?types)",
				"?res rdf:type type_url. ?type_url rdfs:label ?type.", // Needed?
				true
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
		reqwest({
			url: url,
			type: 'jsonp', 
			success: function (data) {
				if (data.results && data.results.bindings) {
					callback(data.results.bindings);
				}

			}
		});
	},

	_parse: function (items) {
		for (var i = 0, len = items.length; i < len; i++) {
			var data   = this._simplify(items[i]),
				marker = L.marker([data.lat, data.lng], this.options.marker);

			marker.data = data;

			this.addLayer(marker);
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

	_getFilter: function () {
		var query = this.options.query;
		if (query.bounds) {
			return this._getBoundsFilter(query.bounds);
		}
		return '';
	},

	_getBoundsFilter: function (latLngBounds) {
		latLngBounds = L.latLngBounds(latLngBounds);
		return L.Util.template('(?lng > {west} AND ?lng < {east} AND ?lat > {south} AND ?lat < {north})', {
			south: latLngBounds.getSouth(),
			west:  latLngBounds.getWest(),
			north: latLngBounds.getNorth(),
			east:  latLngBounds.getEast()
		});

	},

	_getLanguage: function (language) {
		var language = this.options.query.language,
			fields = this.options.query.fields,
			str = '';

		for (var i = 0, len = fields.length; i < len; i++) {
			if (this.options.fields[fields[i]][2]) {			
				str += "AND LANG(?" + fields[i] + ")='" + language + "' ";
			};
		}

		return str;
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