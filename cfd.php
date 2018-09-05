<?php
if(isset($_FILES['pdf'])) {
	// echo $_FILES['pdf']['tmp_name'];
	$url = 'uploads/' . uniqid() . '.pdf';
	$pdf = move_uploaded_file($_FILES['pdf']['tmp_name'], './' . $url);
	$url = "cfd.php?pdf=" . urlencode($url);
	if(isset($_REQUEST['json'])) {
		$url .= '&json=' . urlencode($_REQUEST['json']);
	}
	if(isset($_REQUEST['json2'])) {
		$url .= '&json2=' . urlencode($_REQUEST['json2']);
	}
	header("Location: $url");
	exit(0);
}
if(isset($_FILES['json'])) {
	// echo $_FILES['json']['tmp_name'];
	$url = 'uploads/' . uniqid() . '.json';
	$json = move_uploaded_file($_FILES['json']['tmp_name'], './' . $url);
	$url = "cfd.php?json=" . urlencode($url);
	if(isset($_REQUEST['pdf'])) {
		$url .= '&pdf=' . urlencode($_REQUEST['pdf']);
	}
	if(isset($_REQUEST['json2'])) {
		$url .= '&json2=' . urlencode($_REQUEST['json2']);
	}
	header("Location: $url");
	exit(0);
}
if(isset($_FILES['json2'])) {
	// echo $_FILES['json2']['tmp_name'];
	$url = 'uploads/' . uniqid() . '.json';
	$json = move_uploaded_file($_FILES['json2']['tmp_name'], './' . $url);
	$url = "cfd.php?json2=" . urlencode($url);
	if(isset($_REQUEST['pdf'])) {
		$url .= '&pdf=' . urlencode($_REQUEST['pdf']);
	}
	if(isset($_REQUEST['json'])) {
		$url .= '&json=' . urlencode($_REQUEST['json']);
	}
	header("Location: $url");
	exit(0);
}
$pdfURL = false;
if(isset($_GET['pdf']) && !empty($_GET['pdf'])) {
	$pdfURL = $_GET['pdf'];
}
$jsonURL = false;
if(isset($_GET['json']) && !empty($_GET['json'])) {
	$jsonURL = $_GET['json'];
}
$json2URL = false;
if(isset($_GET['json2']) && !empty($_GET['json2'])) {
	$json2URL = $_GET['json2'];
}
?>
<!DOCTYPE html>
<html style="height: 100%; overflow: hidden;">
	<head>
		<link href="https://fonts.googleapis.com/css?family=Lato" rel="stylesheet">
		<script src="https://code.jquery.com/jquery-3.3.1.min.js"></script>
		<script src="https://cdn.jsdelivr.net/npm/vue/dist/vue.js"></script>
		<script src="https://mozilla.github.io/pdf.js/build/pdf.js"></script>
		<title>Custom Form Designer</title>
		<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
		<link rel="stylesheet" type="text/css" href="styles.css">
	</head>
	<body class="h-100">
		<div id="cfd_el" class="h-100">
			<div class="leftbar">
				<form id="pdf_form" action="" method="POST" enctype="multipart/form-data">
					<div class="header-aux text-left pl-3">Base PDF</div>
					<?php if($pdfURL): ?>
					<div class="section-aux p-3 text-left">
						<div title="<?= $pdfURL ?>" class="mt-0 font-weight-bold">
							Loaded&nbsp;&nbsp;
							<a href="?json=<?= $jsonURL ? $jsonURL : '' ?>"
								class="d-inline-block text-danger">Close</a>
						</div>
					</div>
					<?php else: ?>
					<div class="section-aux p-3 text-left">
						<input type="file" id="pdf" name="pdf" v-on:change="uploadPDF">
					</div>
					<?php endif; ?>
				</form>

				<div v-if="loadedPDF" class="header-aux text-left pl-3">
					<label>
						<input type="checkbox" v-model="hasHTML1">
						Participant #1 HTML
					</label>
				</div>
				<div v-if="loadedPDF && hasHTML1" class="section-aux p-3 text-left">
					<div v-if="html1">
						<b>OK</b>&nbsp;&nbsp;
						<a v-on:click="pastingHTML1=true" class="d-inline-block text-danger">Edit</a>&nbsp;
						<a v-on:click="html1=''" class="d-inline-block text-danger">Reset</a>
					</div>
					<div v-if="!html1">
						<i>Not Set</i>&nbsp;&nbsp;
						<a v-on:click="pastingHTML1=true" class="d-inline-block text-danger">Paste</a>
					</div>
					Who:&nbsp;&nbsp;<select class="mt-2" v-model="signer1">
						<option value="">-</option>
						<option value="employee">Employee</option>
						<option value="employer">Employer</option>
					</select>
				</div>

				<div v-if="loadedPDF" class="header-aux text-left pl-3">
					<label>
						<input type="checkbox" v-model="hasHTML2">
						Participant #2 HTML
					</label>
				</div>
				<div v-if="loadedPDF && hasHTML2" class="section-aux p-3 text-left">
					<div v-if="html2">
						<b>OK</b>&nbsp;&nbsp;
						<a v-on:click="pastingHTML2=true" class="d-inline-block text-danger">Edit</a>&nbsp;
						<a v-on:click="html2=''" class="d-inline-block text-danger">Reset</a>
					</div>
					<div v-if="!html2">
						<i>Not Set</i>&nbsp;&nbsp;
						<a v-on:click="pastingHTML2=true" class="d-inline-block text-danger">Paste</a>
					</div>
					Who:&nbsp;&nbsp;<select class="mt-2" v-model="signer2">
						<option value="">-</option>
						<option value="employee">Employee</option>
						<option value="employer">Employer</option>
					</select>
				</div>

				<form v-if="loadedPDF" id="json_form" action="" method="POST" enctype="multipart/form-data">

					<div class="header-aux text-left pl-3">
						<label>
							<input type="radio" name="which_ui" v-model="view" v-bind:value="'signer1'" class="d-inline mr-1 align-middle" v-on:change="refreshPreviewFields"> Participant #1 Fields
							<a class="float-right mr-2 in-header-link" v-on:click="showMappings('signer1')">JSON</a>
						</label>
					</div>

					<div class="section-aux p-3 text-left">
						<div>
							<label class="d-inline-block mt-0 mb-0 mr-2"><input class="align-middle" type="radio" name="json_src" v-model="jsonSrc" v-bind:value="'custom'">&nbsp;Custom</label>
							<label class="d-inline-block mt-0 mb-0 mr-2"><input class="align-middle" type="radio" name="json_src" v-model="jsonSrc" v-bind:value="'load'">&nbsp;Load</label>
							<label class="d-inline-block mt-0 mb-0 mr-2" v-if="html1"><input class="align-middle" type="radio" name="json_src" v-model="jsonSrc" v-bind:value="'pick'" v-on:change="detectFieldsFromHTML('signer1')">&nbsp;Detect</label>
						</div>

						<div v-show="jsonSrc=='load'">
							<?php if($jsonURL): ?>
								<div title="<?= $jsonURL ?>" class="mt-0 font-weight-bold">
									<?= $jsonURL ?>
									<br>
									<a href="?pdf=<?= $pdfURL ? $pdfURL : '' ?>" class="d-inline-block text-danger">Close</a>
								</div>
							<?php else: ?>
								<input class="p-0 m-0" type="file" id="json" name="json" v-on:change="uploadJSON">
							<?php endif; ?>
						</div>
					</div>

					<div class="header-aux text-left pl-3">
						<label>
							<input type="radio" name="which_ui" v-model="view" v-bind:value="'signer2'" class="d-inline mr-1 align-middle" v-on:change="refreshPreviewFields"> Participant #2 Fields
							<a class="float-right mr-2 in-header-link" v-on:click="showMappings('signer2')">JSON</a>
						</label>
					</div>

					<div class="section-aux p-3 text-left">
						<div>
							<label class="d-inline-block mt-0 mb-0 mr-2"><input class="align-middle" type="radio" name="json2_src" v-model="json2Src" v-bind:value="'custom'">&nbsp;Custom</label>
							<label class="d-inline-block mt-0 mb-0 mr-2"><input class="align-middle" type="radio" name="json2_src" v-model="json2Src" v-bind:value="'load'">&nbsp;Load</label>
							<label class="d-inline-block mt-0 mb-0 mr-2" v-if="html2"><input class="align-middle" type="radio" name="json2_src" v-model="json2Src" v-bind:value="'pick'" v-on:change="detectFieldsFromHTML('signer2')">&nbsp;Detect</label>
						</div>
						<div v-show="json2Src=='load'">
							<?php if($json2URL): ?>
								<div title="<?= $json2URL ?>" class="mt-0 font-weight-bold">
									<?= $json2URL ?>
									<br>
									<a href="?pdf=<?= $pdfURL ? $pdfURL : '' ?>" class="d-inline-block text-danger">Close</a>
								</div>
							<?php else: ?>
								<input class="p-0 m-0" type="file" id="json2" name="json2" v-on:change="uploadJSON">
							<?php endif; ?>
						</div>
					</div>

					<div class="header-aux text-left pl-3">
						<label>
							Settings
						</label>
					</div>

					<div class="section-aux p-3 text-left">
						<label class="d-block mb-1">Font Size: <input type="number" v-model="fontSize" class="p-0 pl-2 ml-2 rounded" v-on:change="refreshPreviewFields"></label>
						<label class="d-block mb-1"><input type="checkbox" v-model="signReqd">&nbsp;Signature Required</label>
					</div>

				</form>

				<div class="header-aux position-absolute w-100 generate-postable-json text-center p-3 bg-light border-top">
						<div class="load-icon d-inline-block" title="Load">
							<input type="file" id="formFile" v-on:change="loadForm">
						</div>
						<img src="images/save.png"
							class="save-icon d-inline-block ml-3"
							v-on:click="saveForm()"
							title="Save">
						<img src="images/json.png"
							class="save-icon d-inline-block ml-3"
							v-on:click="generatePostableJSON"
							title="Postable JSON">
						<img src="images/run.png"
							class="save-icon d-inline-block ml-3"
							title="Run">
				</div>

			</div>

			<div class="bg-dark pt-2 h-100">
				<div class="header text-center">
					<b class="text-light font-weight-bold float-left">{{ name }}</b>
					<span v-if="loadedPDF" class="float-right">
						<button v-if="loadedPDF" v-show="pdfPage > 1" class="pagebtn btn btn-xs btn-info" v-on:click="prevPage">Prev Page</button>
						<span class="text-light p-2">Page: <b class="text-light">{{ pdfPage }}</b> / <b class="text-light">{{ loadedPDF.numPages}}</b></span>
						<button v-if="loadedPDF" v-show="pdfPage < loadedPDF.numPages" class="pagebtn btn btn-xs btn-info" v-on:click="nextPage">Next Page</button>
					</span>
					<span v-if="loadedPDF" class="float-right mr-3 pr-3 border-right h-100 border-dark">
						<b>{{ ptWidth.toFixed(0) }}</b> x <b>{{ ptHeight.toFixed(0) }}</b> points
					</span>
					<span v-if="loadedPDF && sizeWidth && sizeHeight" class="float-right mr-3 pl-3 pr-3 border-right border-left h-100 border-dark">
						<a href="#" v-on:click="changeSizeWidth"><b><u class="text-light cursor-pointer">{{ sizeWidth.toFixed(2) }}</u></b></a>
						x
						<a href="#" v-on:click="changeSizeHeight"><b><u class="text-light cursor-pointer">{{ sizeHeight.toFixed(2) }}</u></b></a>
						inches
					</span>
					<span v-if="loadedPDF" class="float-right mr-3 pl-3 border-left h-100 border-dark">
						<a href="#" v-on:click="changePPI"><b><u class="text-light cursor-pointer">{{ ppi }}</u></b></a> ppi
					</span>
				</div>
				<div id="preview_outer">
					<canvas id="preview" class="d-block m-auto"></canvas>
				</div>
			</div>

			<div class="rightbar">
				<div class="header-aux text-left pl-3">+ New Field</div>
				<div class="section-aux p-3 add-new-field text-center">
					<button class="btn btn-xs btn-success mt-0" v-on:click="addField('text')">
						<img src="images/text.png">
						Text
					</button>
					<button class="btn btn-xs btn-success mt-0" v-on:click="addField('checkbox')">
						<img src="images/check.png">
						Check
					</button>
					<button class="btn btn-xs btn-success mt-0 mb-0" v-on:click="addField('radio')">
						<img src="images/radio.png">
						Radio
					</button>
				</div>

				<div class="header-aux text-left pl-3">Fields: Page {{ pdfPage }}</div>
				<div class="section-aux fields"></div>

				<div class="header-aux text-left pl-3">Selected ({{ numSelectedFields() }})</div>
				<div v-if="numSelectedFields() === 1" class="section-aux p-3 selected-field">
					<div class="text-nowrap">
						<label>Type:</label><b>{{ selProp('type') }}</b>
					</div>
					<div class="text-nowrap">
						<label>Name:</label><b>{{ selProp('name') }}</b>
					</div>
					<div v-if="selProp('type') === 'radio'">
						<label>Value:</label><b>{{ selProp('value') }}</b>
					</div>
					<div class="text-nowrap">
						<label>Pos X:</label><b class="editable" v-on:click="editProp('xpt')">{{ parseFloat(selProp('xpt')).toFixed(2) }}</b>
					</div>
					<div class="text-nowrap">
						<label>Pos Y:</label><b class="editable" v-on:click="editProp('ypt')">{{ parseFloat(selProp('ypt')).toFixed(2) }}</b>
					</div>
					<div v-if="selProp('type') === 'text'">
						<hr class="mb-2 mt-2">
						<div class="text-nowrap">
							<label>Display:</label><b class="editable" v-on:click="editProp('display')">{{ selProp('display') }}</b>
						</div>
						<div class="text-nowrap">
							<label>Filter:</label><b class="editable" v-on:click="editProp('filter')">{{ selProp('filter') }}</b>
						</div>
						<div class="text-nowrap">
							<label>Format:</label><b class="editable" v-on:click="editProp('format')">{{ selProp('format') }}</b>
						</div>
						<div class="text-nowrap">
							<label>Letter Space:</label><b class="editable" v-on:click="editProp('letter_space')">{{ selProp('letter_space') }}</b>
						</div>
						<hr class="mb-2 mt-2">
						<div class="text-nowrap">
							<label>Length:</label><b class="editable" v-on:click="editProp('length')">{{ selProp('length') }}</b>
						</div>
						<div class="text-nowrap">
							<label>Spacing:</label><b class="editable" v-on:click="editProp('spacing')">{{ selProp('spacing') }}</b>
						</div>
						<div class="text-nowrap">
							<label>Wrap:</label><b class="editable" v-on:click="editProp('wrap')">{{ selProp('wrap') }}</b>
						</div>
					</div>
				</div>
				<div v-if="numSelectedFields() > 1" class="section-aux p-3 selected-field">
					<div>
						<label>Pos X:</label><b class="editable" v-on:click="editProp('xpt')">Click to edit</b>
					</div>
					<div>
						<label>Pos Y:</label><b class="editable" v-on:click="editProp('ypt')">Click to edit</b>
					</div>
				</div>
				<div class="header-aux position-absolute w-100 cursor-indicator text-left pl-3">Cursor: <b class="text-light">{{ parseFloat(cursorX).toFixed(2) }}, {{ parseFloat(cursorY).toFixed(2) }}</b></div>
			</div>
			<div v-show="pastingHTML1" id="html1_outer" class="position-fixed w-100 h-100 p-5">
				<div class="d-block w-100 h-100 position-relative">
					<textarea id="html1" placeholder="Paste HTML here" class="d-block w-100 h-100" v-model="html1"></textarea>
					<button class="btn btn-xs position-absolute mt-0 save_html" v-on:click="pastingHTML1=false">Close</button>
				</div>
			</div>
			<div v-show="pastingHTML2" id="html2_outer" class="position-fixed w-100 h-100 p-5">
				<div class="d-block w-100 h-100 position-relative">
					<textarea id="html2" placeholder="Paste HTML here" class="d-block w-100 h-100" v-model="html2"></textarea>
					<button class="btn btn-xs position-absolute mt-0 save_html" v-on:click="pastingHTML2=false">Close</button>
				</div>
			</div>
			<div v-show="generatingJSON" id="json_outer" class="position-fixed w-100 h-100 p-5">
				<div class="d-block w-100 h-100 position-relative">
					<textarea id="postable_json" readonly="readonly" class="d-block w-100 h-100" v-model="postableJSON"></textarea>
					<button class="btn btn-xs position-absolute mt-0 save_html" v-on:click="generatingJSON=false">Close</button>
				</div>
			</div>
			<div v-show="viewingMappings" id="mappings_outer" class="position-fixed w-100 h-100 p-5">
				<div class="d-block w-100 h-100 position-relative">
					<textarea id="mappings_json" readonly="readonly" class="d-block w-100 h-100" v-model="mappingsJSON"></textarea>
					<button class="btn btn-xs position-absolute mt-0 save_html" v-on:click="viewingMappings=false">Close</button>
				</div>
			</div>
		</div>
		<form id="download_form" action="download.php" target="_blank" method="POST" enctype="multipart/form-data">
			<input type="hidden" name="input" value="">
			<input type="hidden" name="name" value="">
		</form>
		<script type="text/javascript">
		window.cfdAppState = {};
		window.cfdAppState.pdfURL = '';
		<?php if($pdfURL) { ?>
			window.cfdAppState.pdfURL = '<?= $pdfURL ?>';
		<?php } ?>
		window.cfdAppState.jsonURL = '';
		<?php if($jsonURL) { ?>
			window.cfdAppState.jsonURL = '<?= $jsonURL ?>';
		<?php } ?>
		window.cfdAppState.json2URL = '';
		<?php if($json2URL) { ?>
			window.cfdAppState.json2URL = '<?= $json2URL ?>';
		<?php } ?>
		</script>
		<script type="text/javascript" src="cfd.js"></script>
	</body>
</html>
