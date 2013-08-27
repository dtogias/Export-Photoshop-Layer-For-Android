/**
 * Export for iOS Photoshop Script
 *
 * Author: Daniel Wood (runloop.com)
 * Twitter: @loadedwino
 *
 * This script is intended to be used on a photoshop document containing retina 
 * artwork for iOS. It will resize, trim and save the selected layer or group, into a 
 * directory you select using the layer name (normalised) for the file name. There are a  
 * couple of resizing options you can select such as the
 * resizing method and whether to scale styles or not. It does not alter your original
 * document in anyway.
 *
 * Feel free to share/reuse/modify to your hearts content. Attribution would be nice but
 * is not required.
 */

// constants
var ResizeMethod = {
    NEARESTNEIGHBOUR: {name: 'Nearest Neighbour', value: 'Nrst'},
    BILINEAR: {name: 'Bilinear', value: 'Blnr'},
    BICUBIC: {name: 'Bicubic', value: 'Bcbc'},
    BICUBICSMOOTHER: {name: 'Bicubic Smoother', value: 'bicubicSmoother'},
    BICUBICSHARPER: {name: 'Bicubic Sharper', value: 'bicubicSharper'}
};
var resizeMethodLookup = {};
resizeMethodLookup[ResizeMethod.NEARESTNEIGHBOUR.name] = ResizeMethod.NEARESTNEIGHBOUR.value;
resizeMethodLookup[ResizeMethod.BILINEAR.name] = ResizeMethod.BILINEAR.value;
resizeMethodLookup[ResizeMethod.BICUBIC.name] = ResizeMethod.BICUBIC.value;
resizeMethodLookup[ResizeMethod.BICUBICSMOOTHER.name] = ResizeMethod.BICUBICSMOOTHER.value;
resizeMethodLookup[ResizeMethod.BICUBICSHARPER.name] = ResizeMethod.BICUBICSHARPER.value;

var ResizeOptions = {
    REGULAR: 1,
    RETINA: 2
};

var exportDialog;

// http://davidchambersdesign.com/photoshop-save-for-web-javascript/
function saveForWebPNG(doc, outputFolderStr, filename)
{
    var opts, file;
    opts = new ExportOptionsSaveForWeb();
    opts.format = SaveDocumentType.PNG;
    opts.PNG8 = false;
    opts.quality = 100;
    if (filename.length > 27) {
        file = new File(outputFolderStr + "/temp.png");
        doc.exportDocument(file, ExportType.SAVEFORWEB, opts);
        file.rename(filename + ".png");
    }
    else {
        file = new File(outputFolderStr + "/" + filename + ".png");
        doc.exportDocument(file, ExportType.SAVEFORWEB, opts);
    }
}

function resizeImage(width, method, scaleStyles)
{
    var idImgS = charIDToTypeID( "ImgS" );
    var desc4 = new ActionDescriptor();
    var idWdth = charIDToTypeID( "Wdth" );
    var idPxl = charIDToTypeID( "#Pxl" );
    desc4.putUnitDouble( idWdth, idPxl, width );
    
    if(scaleStyles == true)
    {
        var idscaleStyles = stringIDToTypeID( "scaleStyles" );
        desc4.putBoolean( idscaleStyles, true );
    }
    
    var idCnsP = charIDToTypeID( "CnsP" );
    desc4.putBoolean( idCnsP, true );
    var idIntr = charIDToTypeID( "Intr" );
    var idIntp = charIDToTypeID( "Intp" );
    var idNrst = charIDToTypeID( method );
    desc4.putEnumerated( idIntr, idIntp, idNrst );
    executeAction( idImgS, desc4, DialogModes.NO );
}

function exportImages(resizeOption, resizeMethod, scaleStyles)
{
    // select a folder to save to
    var folder = Folder.selectDialog(); 
    if(folder)
    {
        // get currect document
        var doc = app.activeDocument;

        // create new document based on the current docs values except name which user 
        var dup = app.documents.add(doc.width, doc.height, doc.resolution, doc.activeLayer.name, NewDocumentMode.RGB, DocumentFill.TRANSPARENT);

        // switch back to origal doc to allow duplicate
        app.activeDocument = doc;

        // duplicate the selected layer (only works for one) at place it in the new doc
        doc.activeLayer.duplicate(dup);

        // switch back to the new document
        app.activeDocument = dup;

        // trim the document so that all that appears is our element
        dup.trim(TrimType.TRANSPARENT);

        // adjust canvas size so that it is an even number of pixels (so scaling down fits on whole pixel)
        dup.resizeCanvas(Math.ceil(dup.width/2)*2, Math.ceil(dup.height/2)*2, AnchorPosition.TOPLEFT);
        
        // normalise name (basic normalisation lower case and hyphenated, modify or remove to taste)
        var normalisedName = dup.name.toLowerCase().replace(' ', '-');

        // export retina image
        if((resizeOption & ResizeOptions.RETINA) != 0)
            saveForWebPNG(dup, folder.fullName, normalisedName + '@2x');

        if((resizeOption & ResizeOptions.REGULAR) != 0)
        {
            // resize image
            resizeImage(dup.width/2, resizeMethod, scaleStyles);
            //dup.resizeImage(dup.width/2, dup.height/2, dup.resolution, ResampleMethod.BILINEAR);
   
            // export regular image
            saveForWebPNG(dup, folder.fullName, normalisedName);
        }
        
        dup.close(SaveOptions.DONOTSAVECHANGES);
    }
}

function okClickedHandler()
{
    var resizeMethod = resizeMethodLookup[exportDialog.methodOptions.selection.text];
    var scaleStyles = exportDialog.scaleStylesCheckBox.value;
    var resizeOption;
    
    if(exportDialog.sizesPanel.retina.value == true)
        resizeOption = ResizeOptions.RETINA;
    else if(exportDialog.sizesPanel.regular.value == true)
        resizeOption = ResizeOptions.REGULAR;
    else if(exportDialog.sizesPanel.both.value == true)
        resizeOption = (ResizeOptions.REGULAR | ResizeOptions.RETINA);
    
    exportImages(resizeOption, resizeMethod, scaleStyles);
}

exportDialog = new Window('dialog', 'Export Selected Layer for iOS'); 
exportDialog.alignChildren = 'left';
exportDialog.sizesPanel = exportDialog.add('panel', undefined, 'Export Sizes');
exportDialog.sizesPanel.alignChildren = 'left';
exportDialog.sizesPanel.both = exportDialog.sizesPanel.add('radiobutton', undefined, 'Regular + Retina');
exportDialog.sizesPanel.regular = exportDialog.sizesPanel.add('radiobutton', undefined, 'Regular Only');
exportDialog.sizesPanel.retina = exportDialog.sizesPanel.add('radiobutton', undefined, 'Retina Only'); 
exportDialog.sizesPanel.both.value = true;

exportDialog.methodOptions = exportDialog.add('dropdownlist', undefined, [ResizeMethod.NEARESTNEIGHBOUR.name, ResizeMethod.BILINEAR.name, ResizeMethod.BICUBIC.name, ResizeMethod.BICUBICSMOOTHER.name, ResizeMethod.BICUBICSHARPER.name]);
exportDialog.methodOptions.children[1].selected = true;
exportDialog.scaleStylesCheckBox = exportDialog.add('checkbox', undefined, 'Scale Styles');
exportDialog.scaleStylesCheckBox.value = true;

exportDialog.buttonGroup = exportDialog.add('group');
exportDialog.buttonGroup.cancelButton = exportDialog.buttonGroup.add('button', undefined, 'Cancel');
exportDialog.buttonGroup.okButton = exportDialog.buttonGroup.add('button', undefined, 'OK');
exportDialog.buttonGroup.okButton.addEventListener('click', okClickedHandler);
exportDialog.show();