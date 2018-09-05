var pdfPage = 1, ptWidth = 0, ptHeight = 0;

var currentField = null;

var mappings = {
	"0": {

	}
};

function uploadPDF() {
	$('#pdf_form').submit();
	return false;
}
function uploadJSON() {
	$('#json_form').submit();
	return false;
}

function prevPage() {
	if(pdfPage > 1) {
		pdfPage--;
		$('#page_num').text(pdfPage);
		renderPDF(addPreviewFields);
	}
	return false;
}
function nextPage() {
	pdfPage++;
	$('#page_num').text(pdfPage);
	renderPDF(addPreviewFields);
}

function setCurrentField(_field) {
	currentField = _field;
	$('.selected-field').empty();
	if(_field) {
		$('.selected-field')
			.append('<div><label>Name: </label><b>' + _field.attr('elem-name') + '</b></div>')
			.append('<div><label>Type: </label><b>' + _field.attr('elem-type') + '</b></div>')
			.append('<div><label>Position: </label><b>' + _field.attr('elem-x') + ', ' + _field.attr('elem-y') + '</b></div>');
		if(_field.attr('elem-type') === 'radio') {
			$('.selected-field')
				.append('<div><label>Value: </label><b>' + _field.attr('elem-value') + '</b></div>');
		}
	}
}

function addPreviewFields() {
	$('.preview-field').remove();

	var holder = $('.field_container');

	var _data = mappings; // JSON.parse($('#pos_path').val());

	// load json
	// $.get($('#pos_path').val(), function(_data) {
		console.log(_data);

		var pageNum = '' + (pdfPage-1);

		if(!_data[pageNum]) return;

		for(var field in _data[pageNum]) {
			if(_data[pageNum].hasOwnProperty(field)) {
				var elem = _data[pageNum][field];
				if(!elem.type) {
					$('<div/>')
						.addClass('preview-field')
						.text(field)
						.css({
							left: (elem.x*100/ptWidth) + '%',
							bottom: (elem.y*100/ptHeight) + '%'
						})
						.attr('elem-type', 'text')
						.attr('elem-name', field)
						.attr('elem-x', elem.x)
						.attr('elem-y', elem.y)
						.attr('title', 'TEXT @ [' + elem.x + ', ' + elem.y + ']')
						.appendTo(holder);
				}
				else if(elem.type === 'checkbox') {
					$('<div/>')
						.addClass('preview-field')
						.text('x')
						.css({
							left: (elem['x-t']*100/ptWidth) + '%',
							bottom: (elem['y-t']*100/ptHeight) + '%'
						})
						.attr('elem-type', elem.type)
						.attr('elem-name', field)
						.attr('elem-x', elem['x-t'])
						.attr('elem-y', elem['y-t'])
						.attr('title', 'CHECKBOX @ [' + elem['x-t'] + ', ' + elem['y-t'] + ']')
						.appendTo(holder);
				}
				else if(elem.type === 'radio') {
					var values = [], value = '';
					for(coord in elem) {
						if(coord.indexOf('x-') === 0) {
							value = coord.substr(2);
							if(values.indexOf(value) === -1) {
								values.push(value);
							}
						}
					}
					for(v in values) {
						$('<div/>')
							.addClass('preview-field')
							.text('x')
							.css({
								left: (elem['x-' + values[v]]*100/ptWidth) + '%',
								bottom: (elem['y-' + values[v]]*100/ptHeight) + '%'
							})
							.attr('elem-type', elem.type)
							.attr('elem-name', field)
							.attr('elem-x', elem['x-' + values[v]])
							.attr('elem-y', elem['y-' + values[v]])
							.attr('elem-value', v)
							.attr('title', 'RADIO (value="' + v + '") @ [' + elem['x-' + values[v]] + ', ' + elem['y-' + values[v]] + ']')
							.appendTo(holder);
					}
				}
			}
		}

	// });

	return false;
}

function renderPDF(_done) {

	$('.preview-field').remove();

	// If absolute URL from the remote server is provided, configure the CORS
	// header on that server.
	var url = pdfURL;

	// Loaded via <script> tag, create shortcut to access PDF.js exports.
	var pdfjsLib = window['pdfjs-dist/build/pdf'];

	// The workerSrc property shall be specified.
	pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';

	// Asynchronous download of PDF
	var loadingTask = pdfjsLib.getDocument(url);
	loadingTask.promise.then(function(pdf) {
	  console.log('PDF loaded');
	  
	  // Fetch the first page
	  var pageNumber = pdfPage;
	  pdf.getPage(pageNumber).then(function(page) {

	    console.log('Page loaded', page);

	    ptWidth = page.view[2];
	    ptHeight = page.view[3];

	    $('#pt_width').text(ptWidth);
		$('#pt_height').text(ptHeight);
	    
	    var scale = 1.5;
	    var viewport = page.getViewport(scale);

	    // Prepare canvas using PDF page dimensions
	    var canvas = document.getElementById('preview');
	    var context = canvas.getContext('2d');
	    canvas.height = viewport.height;
	    canvas.width = viewport.width;

	    // Render PDF page into canvas context
	    var renderContext = {
	      canvasContext: context,
	      viewport: viewport
	    };
	    var renderTask = page.render(renderContext);
	    renderTask.then(function () {
	      console.log('Page rendered');

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

	      selectionRect = $('.selection_rect');

	      $('#preview_outer').scrollTop(0);

	      if(_done) _done();

	    });
	  });
	}, function (reason) {
	  // PDF loading error
	  console.error(reason);
	});
}

function addField(_type) {
	var name = prompt('Field name (alphabets, numbers & underscores only:');
	if(!name || $.trim(name) === '') {
		return false;
	}
	if(typeof mappings['' + (pdfPage - 1)][name] !== 'undefined') {
		alert('Duplicate field!');
		return addField();
	}
	var field = {};
	switch(_type) {
		case 'checkbox':
			field.type = _type;
			field['x-t'] = '10';
			field['y-t'] = '772';
			break;
		case 'radio':
			field.type = _type;
			field['x-0'] = '10';
			field['y-0'] = '772';
			break;
		default:
			field['x'] = '10';
			field['y'] = '772';
			break;
	}
	mappings['' + (pdfPage - 1)][name] = field;
	addPreviewFields();
	return false;
}

$(document)
	.ready(function() {
		if(pdfURL && pdfURL !== '') {
			pdfPage = 1;
			renderPDF(function() {
				if(jsonURL && jsonURL !== '') {
					$.get(jsonURL, function(_data) {
						mappings = _data;
						addPreviewFields();
					}, 'json');
				}
			});
		}
	})
	.on('click', '.preview-field', function(_e) {
		$('.preview-field.current').removeClass('current');
		$(this).addClass('current');
		setCurrentField($(this));
		return false;
	})
	.on('mousedown', '.preview-field', function(_e) {
		moving = $(this);
		lastPos = {
			left: _e.screenX,
			top: _e.screenY
		};
		return false;
	})
	.on('click', '.field_container', function() {
		$('.preview-field.current').removeClass('current');
		setCurrentField(null);
		return false;
	})
	.on('mousemove', '.field_container', function(_e) {
		if(moving || selecting) {
			var xDelta = _e.screenX - lastPos.left,
				yDelta = _e.screenY - lastPos.top;
			if(moving) {
				moving.css({
					left: (moving.position().left + xDelta) + 'px',
					top: (moving.position().top + yDelta) + 'px',
					bottom: 'auto'
				});
				lastPos = {
					left: _e.screenX,
					top: _e.screenY
				};
			}
			else if(selecting) {
				var nLeft = selectionRect.position().left, 
					nTop = selectionRect.position().top, 
					nWidth = selectionRect.width(), 
					nHeight = selectionRect.height();

				if(_e.offsetX < startOffset.left) {
					nLeft = _e.offsetX;
					nWidth = startOffset.left - _e.offsetX;
				}
				else {
					nWidth = _e.offsetX - startOffset.left;
				}
				if(_e.offsetY < startOffset.top) {
					nTop = _e.offsetY;
					nHeight = startOffset.top - _e.offsetY;
				}
				else {
					nHeight = _e.offsetY - startOffset.top;
				}

				selectionRect.css({
					left: nLeft + 'px',
					top: nTop + 'px',
					width: nWidth + 'px',
					height: nHeight + 'px'
				});
			}
		}
		return false;
	})
	.on('mouseup mouseleave', '.field_container', function(_e) {
		if(moving) {
			moving = false;
			return false;
		}
		if(selecting) {
			selecting = false;
			$(this).removeClass('selecting');
			// selectionRect.css({display: 'none'});
			return false;
		}
	})
	.on('mousedown', '.field_container', function(_e) {
		selecting = true;
		selectionRect.css({
			display: 'block',
			left: _e.offsetX + 'px',
			top: _e.offsetY + 'px',
			width: 0,
			height: 0
		});
		startOffset = {
			left: _e.offsetX,
			top: _e.offsetY
		};
		$(this).addClass('selecting');
		return false;
	})
	.on('keydown', function(_e) {
		if(!currentField) return;
		console.log(_e.which);
		var field = $(currentField), consumed = false;
		switch(_e.which) {
			case 38: // up
				field.css({
					top: (field.position().top - 1) + 'px',
					bottom: 'auto'
				});
				consumed = true;
				break;
			case 40: // down
				field.css({
					top: (field.position().top + 1) + 'px',
					bottom: 'auto'
				});
				consumed = true;
				break;
			case 37: // left
				field.css({
					left: (field.position().left - 1) + 'px',
					bottom: 'auto'
				});
				consumed = true;
				break;
			case 39: // right
				field.css({
					left: (field.position().left + 1) + 'px',
					bottom: 'auto'
				});
				consumed = true;
				break;
		}
		if(consumed) return false;
	});