var cfdApp = new Vue({

	el: '#cfd_el',

	data: {

		name: 'CFB Form',
		
		pdfURL: window.cfdAppState.pdfURL,
		jsonURL: window.cfdAppState.jsonURL,
		json2URL: window.cfdAppState.json2URL,

		jsonSrc: 'custom',
		json2Src: 'custom',

		hasHTML1: true,
		hasHTML2: false,
		html1: '',
		html2: '',
		pastingHTML1: false,
		pastingHTML2: false,

		signer1: 'employee',
		signer2: '',

		loadedPDF: false,	// pdf.js loaded-pdf
		renderedPage: false,

		pdfPage: 1,			// the current rendered page of the pdf (1-based)
		ptWidth: 0,			// point-width of current page
		ptHeight: 1,		// point-height of current page
		sizeWidth: false,		// inch-width of current page
		sizeHeight: false,		// inch-height of current page
		ppi: 72,			// can override

		view: "signer1",
		mappings: {			// field mappings (raw)
			"signer1": {
				"0": {}
			},
			"signer2": {
				"0": {}
			}
		},

		fields: {			// field mappings (app-format)
			"signer1": [
				{}
			],
			"signer2": [
				{}
			]
		},

		// drag and move
		moving: false, 
		lastPos: {},

		// selection rect
		selecting: false,
		selectionRect: false,
		startOffset: false,

		scale: 1,

		cursorX: 0,
		cursorY: 0,

		history: [],

		selectionDirty: 0,

		placing: false,

		generatingJSON: false,
		postableJSON: '',

		viewingMappings: false,
		mappingsJSON: '',

		fontSize: 9,
		signReqd: true

	},

	methods: {

		// init pdf & json
		initData: function() {
			var self = this;
			if(this.pdfURL && this.pdfURL !== '') {
				this.pdfPage = 1;	
				this.loadPDF(function() {
					if(self.jsonURL && self.jsonURL !== '') {
						$.get(self.jsonURL, function(_data) {
							self.mappings.signer1 = _data;
							self.fields.signer1 = self.mappingsToAppFormat('signer1');
							self.refreshPreviewFields();
							self.refreshFieldsPanel();
						}, 'json');
					}
					if(self.json2URL && self.json2URL !== '') {
						$.get(self.json2URL, function(_data) {
							self.mappings.signer2 = _data;
							self.fields.signer2 = self.mappingsToAppFormat('signer2');
							self.refreshPreviewFields();
							self.refreshFieldsPanel();
						}, 'json');
					}
				});
			}
		},

		// init events
		initEvents: function() {
			var self = this;
			$(document)
				
				// mousedown on field
				.on('mousedown', '.preview-field', function(_e) {

					if(_e.which !== 1) return;

					var field = self.getField($(this).attr('elem-key'));

					// unselect if select and SHIFT
					if(_e.shiftKey && field.selected) {
						field.selected = false;
						self.refreshFieldsPanel();
						self.applySelectionClasses();
					}

					// select if not selected
					else if(!field.selected) {
						if(!_e.shiftKey) {
							self.unselectAllFields();
						}
						field.selected = true;
						self.refreshFieldsPanel();
						self.applySelectionClasses();
					}

					// start move op if already selected
					else {
						self.moving = self.selectedFieldElements();
						console.log(self.moving.length);
						self.lastPos = {
							left: _e.screenX,
							top: _e.screenY
						};
					}
					
					return false;
				})
				.on('mouseover', '.fields .item[target-key]', function() {
					self.highlightField($(this).attr('target-key'));
				})
				.on('mouseleave', '.fields', function() {
					self.unhighlightAllFields();
				})
				.on('mousedown', '.fields .item[target-key]', function(_e) {
					if(_e.which !== 1) return;
					var field = self.getField($(this).attr('target-key'));
					if(!_e.shiftKey) {
						self.unselectAllFields();
						field.selected = true;
					}
					else {
						field.selected = !field.selected;
					}
					self.refreshFieldsPanel();
					self.applySelectionClasses();

					if($(this).attr('positioning') === 'notok') {
						self.placing = $('.preview-field.current');
					}

					return false;
				})
				.on('mousedown', '.field_container', function(_e) {

					if(_e.which !== 1) return;

					if(self.placing) {
						self.pushToHistory();
						self.updatePositionsFromDOMToAppFormat(self.placing);
						self.placing = false;
						self.refreshFieldsPanel();
						return false;
					}
					
					if(!_e.shiftKey) {
						self.unselectAllFields();
						self.refreshFieldsPanel();
						self.applySelectionClasses();
					}

					// start selection-rect op
					self.selecting = true;
					self.selectionRect.css({
						display: 'block',
						left: _e.offsetX + 'px',
						top: _e.offsetY + 'px',
						width: 0,
						height: 0
					});
					self.startOffset = {
						left: _e.offsetX,
						top: _e.offsetY
					};
					$(this).addClass('selecting');
					return false;

				})
				.on('mousemove', '.field_container', function(_e) {

					if(!self.moving && !self.selecting && !self.placing && $(_e.target).is('.field_container')) {
						self.cursorX = _e.offsetX / self.scale;
						self.cursorY = (self.ptHeight - _e.offsetY / self.scale);
					}

					if(self.moving || self.selecting || self.placing) {
						
						if(self.moving) {
							var xDelta = _e.screenX - self.lastPos.left,
								yDelta = _e.screenY - self.lastPos.top;
							self.moving.each(function() {
								$(this).css({
									left: ($(this).position().left + xDelta) + 'px',
									top: ($(this).position().top + yDelta) + 'px',
									bottom: 'auto'
								});
							});
							self.lastPos = {
								left: _e.screenX,
								top: _e.screenY
							};
						}
						else if(self.selecting) {
							
							var nLeft = self.selectionRect.position().left, 
								nTop = self.selectionRect.position().top, 
								nWidth = self.selectionRect.width(), 
								nHeight = self.selectionRect.height();

							if(_e.offsetX < self.startOffset.left) {
								nLeft = _e.offsetX;
								nWidth = self.startOffset.left - _e.offsetX;
							}
							else {
								nLeft = self.startOffset.left;
								nWidth = _e.offsetX - self.startOffset.left;
							}
							if(_e.offsetY < self.startOffset.top) {
								nTop = _e.offsetY;
								nHeight = self.startOffset.top - _e.offsetY;
							}
							else {
								nTop = self.startOffset.top;
								nHeight = _e.offsetY - self.startOffset.top;
							}

							self.selectionRect.css({
								left: nLeft + 'px',
								top: nTop + 'px',
								width: nWidth + 'px',
								height: nHeight + 'px'
							});
						}
						else if(self.placing) {
							self.placing.css({
								left: (_e.offsetX + 5) + 'px',
								top: (_e.offsetY + 5) + 'px',
								bottom: 'auto'
							});
						}
						return false;
					}
				})
				.on('mouseup mouseleave', '.field_container', function(_e) {
					if(self.moving) {
						self.pushToHistory();
						self.updatePositionsFromDOMToAppFormat(self.moving);
						self.moving = false;
						self.refreshFieldsPanel();
						return false;
					}
					if(self.selecting) {
						self.selecting = false;

						// find all fields inside the selection rect and select them
						var elems = $('.preview-field').filter(function() {
							var isOutside = ($(this).offset().top + $(this).height() < self.selectionRect.offset().top)
								|| ($(this).offset().top > self.selectionRect.offset().top + self.selectionRect.height())
								|| ($(this).offset().left + $(this).width() < self.selectionRect.offset().left)
								|| ($(this).offset().left > self.selectionRect.offset().left + self.selectionRect.width());
							return !isOutside;
						});

						// toggle selected
						elems.each(function() {
							var field = self.fields[self.view][self.pdfPage-1][$(this).attr('elem-key')];
							field.selected = !field.selected;
						});
						
						self.selectionRect.css({display: 'none'});

						self.refreshFieldsPanel();
						self.applySelectionClasses();

						$(this).removeClass('selecting');

						return false;
					}
				})

				.on('keydown', function(_e) {
					var consumed = false, newSelection = null, distance = 1, field = false;
					var selected = self.selectedFieldElements();
					if(_e.ctrlKey) distance = 10;
					if(_e.ctrlKey && _e.shiftKey) distance = 50;
					console.log(_e.which);
					switch(_e.which) {
						case 9: // tab/shift+tab to select next/prev field
							self.pushToHistory();
							if(_e.shiftKey) {
								if(!selected.length) {
									field = $('.preview-field').last().attr('elem-key');
								}
								else {
									field = $('.preview-field.current').first().prev('.preview-field').attr('elem-key');
								}
							}
							else {
								if(!selected.length) {
									field = $('.preview-field').first().attr('elem-key');
								}
								else {
									field = $('.preview-field.current').last().next('.preview-field').attr('elem-key');
								}
							}
							self.unselectAllFields();
							if(field) {
								self.getField(field).selected = true;
							}
							self.refreshFieldsPanel();
							self.applySelectionClasses();
							consumed = true;
							break;
						case 65: // select-all
							if(_e.ctrlKey) {
								self.selectAllFields();
								self.refreshFieldsPanel();
								self.applySelectionClasses();
								consumed = true;
							}
							break;
						case 27: // esc to clear selection
							self.unselectAllFields();
							self.refreshFieldsPanel();
							self.applySelectionClasses();
							consumed = true;
							break;
						case 46:
							self.pushToHistory();
							self.deleteSelectedFields();
							self.refreshFieldsPanel();
							break;
						case 38: // up
							if(!selected.length) return;
							self.pushToHistory();
							selected.each(function() {
								$(this).css({
									top: ($(this).position().top - distance) + 'px',
									left: ($(this).position().left) + 'px',
									bottom: 'auto'
								});
							});
							self.updatePositionsFromDOMToAppFormat(selected);
							self.refreshFieldsPanel();
							consumed = true;
							break;
						case 40: // down
							if(!selected.length) return;
							self.pushToHistory();
							selected.each(function() {
								$(this).css({
									top: ($(this).position().top + distance) + 'px',
									left: ($(this).position().left) + 'px',
									bottom: 'auto'
								});
							});
							self.updatePositionsFromDOMToAppFormat(selected);
							self.refreshFieldsPanel();
							consumed = true;
							break;
						case 37: // left
							if(!selected.length) return;
							self.pushToHistory();
							selected.each(function() {
								$(this).css({
									left: ($(this).position().left - distance) + 'px',
									top: ($(this).position().top) + 'px',
									bottom: 'auto'
								});
							});
							self.updatePositionsFromDOMToAppFormat(selected);
							self.refreshFieldsPanel();
							consumed = true;
							break;
						case 39: // right
							if(!selected.length) return;
							self.pushToHistory();
							selected.each(function() {
								$(this).css({
									left: ($(this).position().left + distance) + 'px',
									top: ($(this).position().top) + 'px',
									bottom: 'auto'
								});
							});
							self.updatePositionsFromDOMToAppFormat(selected);
							self.refreshFieldsPanel();
							consumed = true;
							break;
						case 90: // z (undo)
							if(_e.ctrlKey) {
								self.applyFromHistory();
								consumed = true;
							}
							break;
					}
					if(consumed) return false;
				});
				$(window).on('resize', function() {
					if(self.resizing) {
						return;
					}
					self.resizing = true;
					self.renderPDFPage(function() {
						self.refreshPreviewFields();
						self.resizing = false;
					});
				});
		},

		uploadPDF: function() {
			$('#pdf_form').submit();
			return false;
		},
		uploadJSON: function() {
			$('#json_form').submit();
			return false;
		},
		setHTML1: function() {
			this.html1 = $('#html1').val();
			this.pastingHTML1 = false;
		},
		setHTML2: function() {
			this.html2 = $('#html2').val();
			this.pastingHTML2 = false;
		},
		detectFieldsFromHTML: function(_view) {
			
			var self = this;

			$('.cfb-field-detector').remove();
			$('<div/>')
				.addClass('cfb-field-detector')
				.css({
					visibility: 'hidden'
				})
				.html(_view === 'signer1' ? this.html1 : this.html2)
				.appendTo('body');


			var inputs = {}, i = 0, pos = {}, failed = false;

			if(!$('.cfb-field-detector .cfbpage').length) {
				alert('No .cfbpage elements in the HTML. Detection failed!');
				return;
			}

			// create pages
			$('.cfb-field-detector .cfbpage[data-page]').each(function() {
				var page = '' + $(this).attr('data-page');
				pos[page] = {};
				inputs = {};
				$(this).find('input, select, textarea').each(function() {
					if(!inputs[this.name]) inputs[this.name] = this.type.toLowerCase();
				});
				for(i in inputs) {
					if(inputs.hasOwnProperty(i) && inputs[i] !== 'processed') {

						switch(inputs[i]) {
							case 'radio':
								values = [];
								all = $('input[type=radio][name="' + i + '"]');
								all.each(function() {
									if(typeof this.value !== 'undefined' && values.indexOf(this.value) === -1) {
										values.push(this.value);
									}
									else {
										alert('BEEP! Duplicate/invalid "value" in radio group: ', i);
										$(this).css('outline', '4px solid red');
										failed = true;
									}
								});
								pos[page][i] = {type: 'radio'};
								for(var v in values) {
									pos[page][i]['x-' + values[v]] = 9999;
									pos[page][i]['y-' + values[v]] = 9999;
								}
								break;

							case 'checkbox':
								pos[page][i] = {'x-t': 9999, 'y-t': 9999, type: 'checkbox'};
								break;

							default:
								pos[page][i] = {x: 9999, y: 9999};
								break;
						}

						inputs[i] = 'processed';
				   }
				}
			});

			if(!failed) {
				self.mappings[_view] = pos;
				self.fields[_view] = self.mappingsToAppFormat(_view);
				self.refreshPreviewFields();
				self.refreshFieldsPanel();
				self.clearHistory();
			}

		},
		loadForm: function() {
			var self = this;
		    var reader = new FileReader();
			reader.addEventListener('load', function (e) {
				var loaded = JSON.parse(e.target.result);
				self.name = loaded.name;
				self.pdfURL = loaded.pdfURL;
				self.pdfPage = loaded.pdfPage;
				self.hasHTML1 = loaded.hasHTML1;
				self.hasHTML2 = loaded.hasHTML2;
				self.html1 = loaded.html1;
				self.html2 = loaded.html2;
				self.signer1 = loaded.signer1;
				self.signer2 = loaded.signer2;
				self.signReqd = loaded.signReqd;
				self.fontSize = loaded.fontSize;
				self.loadPDF(function() {
					self.fields = loaded.fields;
					self.refreshPreviewFields();
					self.refreshFieldsPanel();
				});
			});
		    reader.readAsBinaryString($('#formFile')[0].files[0]);
		},
		saveForm: function() {
			this.name = prompt('Form name:', this.name);
			if(!this.name) return false;
			var output = {
				name: this.name,
				fields: this.fields,
				pdfURL: this.pdfURL,
				jsonURL: this.jsonURL,
				json2URL: this.json2URL,
				hasHTML1: this.hasHTML1,
				hasHTML2: this.hasHTML2,
				signer1: this.signer1,
				signer2: this.signer2,
				html1: this.html1,
				html2: this.html2,
				pdfPage: this.pdfPage,
				signReqd: this.signReqd,
				fontSize: this.fontSize
			};
			$('#download_form').find('[name="input"]').val(JSON.stringify(output));
			$('#download_form').find('[name="name"]').val(this.name + '.json');
			$('#download_form').submit();
		},
		generatePostableJSON: function() {
			var self = this;
			self.generatingJSON = true;
			self.postableJSON = 'Please wait...';
			var input = {};
			if(self.hasHTML1) {
				input.html1 = self.html1;
				input.pos1 = JSON.stringify(self.appFormatToMappings('signer1'));
			}
			if(self.hasHTML2) {
				input.html2 = self.html2;
				input.pos2 = JSON.stringify(self.appFormatToMappings('signer2'));
			}
			if(self.hasHTML1 && self.hasHTML2) {
				input.signers = JSON.stringify([self.signer1, self.signer2]);
			}
			input.signReqd = self.signReqd ? 1 : 0;
			input.fontSize = self.fontSize;
			$.post('json.php', input, function(_data) {
				self.postableJSON = _data;
				window.setTimeout(function() {
					$('#postable_json').focus().select();
				}, 100);
			});
		},
		showMappings: function(_view) {
			var self = this;
			self.viewingMappings = true;
			self.mappingsJSON = 'Please wait...';
			$.post('pretty.php', {
				input: JSON.stringify(this.appFormatToMappings(_view))
			}, function(_data) {
				self.mappingsJSON = _data;
				// window.setTimeout(function() {
				// 	$('#mappings_json').focus().select();
				// }, 100);
			});
		},
		prevPage: function() {
			if(this.pdfPage > 1) {
				$('#preview_outer').scrollTop(0);
				var self = this;
				window.setTimeout(function() {
					self.pdfPage--;
					self.renderPDFPage(self.refreshPreviewFields);
				}, 50);
			}
			return false;
		},
		nextPage: function() {
			if(this.pdfPage < this.loadedPDF.numPages) {
				$('#preview_outer').scrollTop(0);
				var self = this;
				window.setTimeout(function() {
					self.pdfPage++;
					self.renderPDFPage(self.refreshPreviewFields);
				}, 50);
			}
			return false;
		},
		clearFields: function() {
			this.unselectAllFields();
			this.unhighlightAllFields();
			$('.preview-field').remove();
		},

		refreshPreviewFields: function() {
			this.clearFields();
			var holder = $('.field_container'), fields = this.fields[this.view];
			if(!fields[this.pdfPage-1]) return;
			fields = fields[this.pdfPage-1];
			for(var field in fields) {
				if(fields.hasOwnProperty(field)) {
					var elem = fields[field];
					var domElem = $('<div/>')
						.addClass('preview-field')
						.text(elem.display)
						.css({
							left: elem.x + 'px',
							bottom: elem.y + 'px',
							fontSize: this.fontSize + 'pt'
						})
						.attr('elem-key', field)
						.appendTo(holder);
					if(elem.type === 'text') this.updateDisplayValueAndFilter(elem, domElem);
				}
			}
			return false;
		},
		updateDisplayValueAndFilter: function(_field, _domElem) {
			var display = _field['display'], formatted = '', i=0, j=0, re = false;
			if(_field['filter']) {
				re = _field['filter'];
				re = re.substr(1);
				re = re.substr(0, re.length-1);
				re = new RegExp(re, 'g');
				if(re) {
					display = display.replace(re, '');
				}
			}
			if(_field['format']) {
				for(var i=0; i<_field['format'].length; i++) {
					if(_field['format'][i] === ' ') {
						formatted += '&nbsp;'
					}
					else {
						formatted += display[j++];
					}
				}
				display = formatted;
			}
			if(_field['letter_space']) {
				_domElem.css({
					letterSpacing: (_field['letter_space'] * 2.5) + 'pt'
				});
			}
			_domElem.html(display);
		},
		updateWrapProperties: function(_field, _domElem) {
			if(_field['length']) {
				_domElem.css({
					width: (_field['length'] * 4.63 * this.scale) + 'px'
				});
			}
			if(_field['wrap']) {
				_domElem.css({
					whiteSpace: 'initial'
				});
			}
			else {
				_domElem.css({
					whiteSpace: 'nowrap'
				});
			}
			if(_field['spacing']) {
				_domElem.css({
					lineHeight: _field['spacing'] + 'pt'
				});
			}
		},
		loadPDF: function(_done) {
			this.clearHistory();
			var self = this;
			var url = self.pdfURL;
			var pdfjsLib = window['pdfjs-dist/build/pdf'];
			pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';
			var loadingTask = pdfjsLib.getDocument(url);
			loadingTask.promise.then(function(pdf) {
				self.loadedPDF = pdf;
				self.pdfPage = 1;
				self.renderPDFPage(_done);
			}, function (reason) {
				console.error(reason);
			});
		},

		renderPDFPage: function(_done) {
			var self = this;
			this.clearFields();
			this.renderedPage = false;
			var pageNumber = self.pdfPage;

			this.clearHistory();

			self.loadedPDF.getPage(pageNumber).then(function(page) {
				self.ptWidth = page.view[2];
				self.ptHeight = page.view[3];

				// calculate inch size if not set
				if(!self.sizeWidth || !self.sizeHeight) {
					self.sizeWidth = parseFloat((self.ptWidth / self.ppi).toFixed(2));
					self.sizeHeight = parseFloat((self.ptHeight / self.ppi).toFixed(2));
				}

				var canvas = document.getElementById('preview');

				$(canvas).css({
					width: self.sizeWidth + 'in',
					height: self.sizeHeight + 'in'
				});
				var scale = self.scale = $(canvas).width() / self.ptWidth;
				
				var viewport = page.getViewport(scale);
				
				var context = canvas.getContext('2d');
				canvas.height = viewport.height;
				canvas.width = viewport.width;
				var renderContext = {
					canvasContext: context,
					viewport: viewport
				};
				var renderTask = page.render(renderContext);
				renderTask.then(function () {
					console.log('Page rendered', page);
					$('.field_container_outer').remove();
					$('<div/>')
					.addClass('field_container_outer')
							.css({
								left: ($(canvas).offset().left - parseInt($('#preview_outer').css('margin-left'), 10)) + 'px',
								top: ($(canvas).offset().top - $('#preview_outer').position().top) + 'px',
								width: $(canvas).width() + 'px',
								height: $(canvas).height() + 'px'
					})
					.appendTo('#preview_outer');
					$('<div/>').addClass('field_container').appendTo('.field_container_outer');
					$('<div/>').addClass('selection_rect').appendTo('.field_container');
					self.selectionRect = $('.selection_rect');
					$('#preview_outer').scrollTop(0);
					self.refreshFieldsPanel();
					setTimeout(function() {
						if(_done) _done.call(self);
					}, 50);
				});
			});
		},

		addField: function(_type) {
			var name = prompt('Field name (alphabets, numbers & underscores only):');
			if(!name || $.trim(name) === '') {
				return false;
			}
			var value = '-';
			if(_type === 'radio') {
				value = prompt('Option value:');
			}
			var key = [name, _type, 0, value].join(':');
			if(typeof this.fields[this.view][this.pdfPage - 1] === 'undefined') {
				this.fields[this.view][this.pdfPage - 1] = {};
			}
			if(typeof this.fields[this.view][this.pdfPage - 1][key] !== 'undefined') {
				alert('Duplicate field name or option value!');
				return false;
			}
			this.pushToHistory();
			this.fields[this.view][this.pdfPage - 1][key] = {
				name: name,
				type: _type,
				x: 10 * this.scale,
				y: 10 * this.scale,
				display: (_type === 'text' ? name : 'x'),
				value: value,
				selected: true,
				instance: 0
			};
			this.refreshPreviewFields();
			this.applySelectionClasses();
			this.refreshFieldsPanel();
			this.placing = $('.preview-field').last();
			return false;
		},

		updatePositionsFromDOMToAppFormat: function(_fields) {
			var self = this;
			$(_fields).each(function() {
				var fieldX = $(this).position().left / self.scale,
					fieldY = self.ptHeight - (($(this).position().top + $(this).height()) / self.scale);
				var field = self.getField($(this).attr('elem-key'));
				if(field) { // this MUST never fail
					field.x = $(this).position().left;
					field.y = (self.ptHeight * self.scale) - ($(this).position().top + $(this).height());
					field.xpt = fieldX;
					field.ypt = fieldY;
				}
				else {
					console.error('Something went terribly wrong!');
				}
			});
		},

		highlightField: function(_key) {
			$('.preview-field.highlighted').removeClass('highlighted');
			$('.preview-field[elem-key="' + _key + '"]').addClass('highlighted');
		},

		unhighlightAllFields: function() {
			$('.preview-field.highlighted').removeClass('highlighted');
		},

		selectAllFields: function() {
			for(var field in this.fields[this.view][this.pdfPage - 1]) {
				this.fields[this.view][this.pdfPage - 1][field].selected = true;
			}
		},

		unselectAllFields: function() {
			for(var field in this.fields[this.view][this.pdfPage - 1]) {
				this.fields[this.view][this.pdfPage - 1][field].selected = false;
			}
		},

		deleteSelectedFields: function() {
			var elements = $();
			for(var field in this.fields[this.view][this.pdfPage - 1]) {
				if(this.fields[this.view][this.pdfPage - 1][field].selected) {
					delete this.fields[this.view][this.pdfPage - 1][field];
					$('.preview-field[elem-key="' + field + '"]').remove();
				}
			}
			elements.remove();
		},

		selectedFieldElements: function() {
			var elements = $();
			for(var field in this.fields[this.view][this.pdfPage - 1]) {
				if(this.fields[this.view][this.pdfPage - 1][field].selected) {
					elements = elements.add($('.preview-field[elem-key="' + field + '"]'));
				}
			}
			return elements;
		},

		selectedFields: function() {
			var fields = [];
			for(var field in this.fields[this.view][this.pdfPage - 1]) {
				if(this.fields[this.view][this.pdfPage - 1][field].selected) {
					fields.push(this.fields[this.view][this.pdfPage - 1][field]);
				}
			}
			return fields;
		},

		numSelectedFields: function() {
			var count = 0;
			for(var field in this.fields[this.view][this.pdfPage - 1]) {
				if(this.fields[this.view][this.pdfPage - 1][field].selected) {
					count++;
				}
			}
			return count;
		},

		firstSelectedField: function() {
			var fields = [];
			for(var field in this.fields[this.view][this.pdfPage - 1]) {
				if(this.fields[this.view][this.pdfPage - 1][field].selected) {
					return this.fields[this.view][this.pdfPage - 1][field];
				}
			}
			return false;
		},

		applySelectionClasses: function() {
			for(var field in this.fields[this.view][this.pdfPage - 1]) {
				if(this.fields[this.view][this.pdfPage - 1][field].selected) {
					$('.preview-field[elem-key="' + field + '"]').addClass('current');
				}
				else {
					$('.preview-field[elem-key="' + field + '"]').removeClass('current');
				}
			}
		},

		fieldExists: function(_name) {
			var field = this.fields[this.view][this.pdfPage - 1][_name];
			return (typeof field !== 'undefined');
		},

		isRadio: function(_name) {
			var field = this.fields[this.view][this.pdfPage - 1][_name];
			return typeof field !== 'undefined' && field.type === 'radio';
		},

		isNumeric: function(n) {
		  return !isNaN(parseFloat(n)) && isFinite(n);
		},

		editProp: function(_prop) {

			var firstSelectedField = this.firstSelectedField(),
				allSelectedFieldElems = false;
			if(!firstSelectedField) return false;

			allSelectedFieldElems = this.selectedFieldElements();

			var newValue = prompt('Enter new ' + _prop + ':', firstSelectedField[_prop]);
			if(!newValue && typeof newValue !== 'string') return false;
			// if($.trim(newValue) === '') {
			// 	alert('Invalid input!');
			// 	return false;
			// }

			if(_prop === 'xpt' || _prop === 'ypt') {

				if(this.isNumeric(newValue)) {
					newValue = parseFloat(newValue);
					if(_prop === 'xpt') {
						if(newValue < 0 || newValue > this.ptWidth) {
							alert('Invalid coordinate!');
							return false;
						}
						else {
							$(allSelectedFieldElems).css({
								left: (newValue*this.scale) + 'px'
							});
						}
					}
					else if(_prop === 'ypt') {
						if(newValue < 0 || newValue > this.ptHeight) {
							alert('Invalid coordinate!');
							return false;
						}
						else {
							$(allSelectedFieldElems).css({
								bottom: (newValue*this.scale) + 'px',
								top: 'auto'
							});
						}
					}
				}
				else {
					alert('Invalid coordinate!');
					return false;
				}
				
				this.updatePositionsFromDOMToAppFormat(allSelectedFieldElems);

			}
			else if(_prop === 'filter' || _prop === 'format' || _prop === 'display') {

				firstSelectedField[_prop] = newValue;

				// update preview_field's text accordingly
				this.updateDisplayValueAndFilter(firstSelectedField, allSelectedFieldElems);

			} 
			else if(_prop === 'letter_space' || _prop === 'spacing' || _prop === 'length') {

				if(this.isNumeric(newValue)) {
					newValue = parseInt(newValue, 10);
					firstSelectedField[_prop] = newValue;
				}
				else {
					alert('Invalid ' + _prop + ' value!');
					return false;
				}

				this.updateWrapProperties(firstSelectedField, allSelectedFieldElems);

			}
			else if(_prop === 'wrap') {
				if(this.isNumeric(newValue)) {
					newValue = parseInt(newValue, 10);
					if(newValue === 0 || newValue === 1) {
						firstSelectedField[_prop] = newValue;	

						this.updateWrapProperties(firstSelectedField, allSelectedFieldElems);
						
					}
					else {
						alert('Invalid ' + _prop + ' value!');
						return false;	
					}
				}
				else {
					alert('Invalid ' + _prop + ' value!');
					return false;
				}
			}

		},

		getField: function(_key) {
			return this.fields[this.view][this.pdfPage-1][_key];
		},

		selProp: function(_prop) {
			var field = this.firstSelectedField();
			console.log(field, _prop, field[_prop]);
			return field ? (typeof field[_prop] === 'undefined' || field[_prop] === '' ? '- not set -' : field[_prop]) : '';
		},

		// == convert from raw to app-format ==
		mappingsToAppFormat: function(_view) {
			var pageIndex = 0, fInput = false, fOutput = false, key = [];
			for(var page in this.mappings[_view]) {
				pageIndex = parseInt(page, 10);
				this.fields[_view][pageIndex] = {};
				for(var field in this.mappings[_view][page]) {
					fInput = this.mappings[_view][page][field];

					if(typeof fInput.type === 'undefined') { // text

						// if x & y are arrays, there are mult instance of this field on the page
						if(Array.isArray(fInput.x) && Array.isArray(fInput.y)) {
							for(var i = 0; i < fInput.x.length; i++) {
								fOutput = {
									name: field,
									type: 'text',
									xpt: fInput.x[i],
									ypt: fInput.y[i],
									x: (fInput.x[i]*this.scale),
									y: (fInput.y[i]*this.scale),
									filter: fInput.filter,
									format: fInput.format,
									letter_space: fInput.letter_space,
									display: field,
									length: fInput.length,
									spacing: fInput.spacing,
									wrap: fInput.wrap,
									selected: false,
									instance: i
								};
								key = [field, 'text', i, '-'].join(':');
								this.fields[_view][pageIndex][key] = fOutput;
							}
						}
						else if(!Array.isArray(fInput.x) && !Array.isArray(fInput.y)) {
							fOutput = {
								name: field,
								type: 'text',
								xpt: fInput.x,
								ypt: fInput.y,
								x: (fInput.x*this.scale),
								y: (fInput.y*this.scale),
								filter: fInput.filter,
								format: fInput.format,
								letter_space: fInput.letter_space,
								display: field,
								length: fInput.length,
								spacing: fInput.spacing,
								wrap: fInput.wrap,
								selected: false,
								instance: 0
							};
							key = [field, 'text', 0, '-'].join(':');
							this.fields[_view][pageIndex][key] = fOutput;
						}

					}
					else if(fInput.type === 'checkbox') {

						fOutput = {
							name: field,
							type: 'checkbox',
							xpt: fInput['x-t'],
							ypt: fInput['y-t'],
							x: (fInput['x-t']*this.scale),
							y: (fInput['y-t']*this.scale),
							display: 'x',
							selected: false,
							instance: 0
						};
						key = [field, 'checkbox', 0, '-'].join(':');
						this.fields[_view][pageIndex][key] = fOutput;

					}
					else if(fInput.type === 'radio') {

						var values = [], value = '';
						for(coord in fInput) {
							if(coord.indexOf('x-') === 0) {
								value = coord.substr(2);
								if(values.indexOf(value) === -1) {
									values.push(value);
								}
							}
						}
						for(v in values) {

							fOutput = {
								name: field,
								type: 'radio',
								xpt: fInput['x-' + values[v]],
								ypt: fInput['y-' + values[v]],
								x: (fInput['x-' + values[v]]*this.scale),
								y: (fInput['y-' + values[v]]*this.scale),
								display: 'x',
								value: values[v],
								selected: false,
								instance: 0
							};
							key = [field, 'radio', 0, values[v]].join(':');
							this.fields[_view][pageIndex][key] = fOutput;

						}
						
					}

				}
			}

			return this.fields[_view];

		},

		appFormatToMappings: function(_view) {

			var pageIndex = 0, fInput = false, fOutput = false, key = [];
			for(var page=0; page<this.fields[_view].length; page++) {
				pageIndex = '' + page
				this.mappings[_view][pageIndex] = {};
				var mappingsPage = this.mappings[_view][pageIndex];
				for(var field in this.fields[_view][page]) {
					fInput = this.fields[_view][page][field];

					if(typeof mappingsPage[fInput.name] === 'undefined') mappingsPage[fInput.name] = {};

					fOutput = mappingsPage[fInput.name];

					if(fInput.type === 'text') {

						// if .x is existing, make it an array or push it if already an array
						if(typeof fOutput['x'] !== 'undefined') {
							if(Array.isArray(fOutput['x'])) {
								fOutput['x'].push(Math.round(fInput.xpt));
								fOutput['y'].push(Math.round(fInput.ypt));
							}
							else {
								fOutput['x'] = [fOutput['x'], Math.round(fInput.xpt)];
								fOutput['y'] = [fOutput['y'], Math.round(fInput.ypt)];	
							}
						}
						else {
							fOutput['x'] = Math.round(fInput.xpt);
							fOutput['y'] = Math.round(fInput.ypt);
						}

						if(fInput.filter) fOutput['filter'] = fInput.filter;
						if(fInput.format) fOutput['format'] = fInput.format;
						if(fInput.letter_space) fOutput['letter_space'] = fInput.letter_space;

						if(fInput.length) fOutput['length'] = fInput.length;
						if(fInput.spacing) fOutput['spacing'] = fInput.spacing;
						if(fInput.wrap) fOutput['wrap'] = fInput.wrap;

					}
					else if(fInput.type === 'checkbox') {

						fOutput['type'] = 'checkbox';
						fOutput['x-t'] = Math.round(fInput.xpt);
						fOutput['y-t'] = Math.round(fInput.ypt);

					}
					else if(fInput.type === 'radio') {

						fOutput['type'] = 'radio';
						fOutput['x-' + fInput.value] = Math.round(fInput.xpt);
						fOutput['y-' + fInput.value] = Math.round(fInput.ypt);
						
					}

				}
			}

			return this.mappings[_view];

		},

		refreshFieldsPanel: function() {
			
			// mark all as processing
			$('.fields .field').attr('processing', '1');

			var key = false, field = false, fpFieldOuter = false;

			for(key in this.fields[this.view][this.pdfPage-1]) {

				field = this.fields[this.view][this.pdfPage-1][key];

				// get or create
				var fpField = $('.fields .field .item[target-key="' + key + '"]');
				if(fpField.length > 1) {
					alert('Oops! Something is terribly wrong. More than 1 field with same key!');
					return;
				}
				else if(!fpField.length) {
					fpField = $('<div/>').attr('target-key', key);
					fpFieldOuter = $('<div/>').addClass('field').attr('processing', '1').appendTo('.fields');
					fpField.appendTo(fpFieldOuter)
				}

				// remove all classes
				fpField.removeClass();

				// type
				fpField.addClass('item').addClass(field.type);

				// selection
				if(field.selected) fpField.addClass('selected');

				// positioning
				if(field.xpt < 0 || field.xpt > this.ptWidth || field.ypt < 0 || field.ypt > this.ptHeight) {
					fpField.attr('positioning', 'notok');
				}
				else {
					fpField.attr('positioning', 'ok');
				}

				// title
				fpField.attr('title', [field.xpt, field.ypt].join(', '));

				// text
				fpField.text(field.name + (field.type === 'radio' ? ' (value: ' + field.value + ')' : ''));

				// mark as processed
				fpField.parent().removeAttr('processing');

			}

			// remove anything remianing as processing
			$('.fields .field[processing]').remove();

		},

		changeSizeWidth: function() {
			var val = prompt('Enter page width in inches:', this.sizeWidth);
			if(!val || !this.isNumeric(val)) return;
			this.sizeWidth = parseFloat(val);
			this.renderPDFPage(this.refreshPreviewFields);
		},
		changeSizeHeight: function() {
			var val = prompt('Enter page height in inches:', this.sizeHeight);
			if(!val || !this.isNumeric(val)) return;
			this.sizeHeight = parseFloat(val);
			this.renderPDFPage(this.refreshPreviewFields);
		},
		changePPI: function() {
			var val = prompt('Enter ppi:', this.ppi);
			if(!val || !this.isNumeric(val)) return;
			this.ppi = parseInt(val, 10);
			this.renderPDFPage(this.refreshPreviewFields);
		},

		// history (undo/redo)
		clearHistory: function() {
			this.history = [];
		},
		pushToHistory: function() {
			if(this.history.length >= 10) {
				this.history.splice(0, 1);
			}
			this.history.push(JSON.stringify(this.fields[this.view][this.pdfPage-1]));
		},
		applyFromHistory() {
			if(!this.history.length) return false; // nothing to pop!
			var historyItem = this.history.splice(this.history.length-1, 1);
			if(historyItem) {
				this.fields[this.view][this.pdfPage-1] = JSON.parse(historyItem);
				this.refreshPreviewFields();
				this.refreshFieldsPanel();
				this.applySelectionClasses();
			}
		}

	},

	mounted: function () {
		this.initData();
		this.initEvents();
	}
});