"use strict";

const padding = document.getElementById("padding");
let pdfDoc = null;
let pageRendering = false;
let renderPending = false;
let renderPendingZoom = 0;
const canvas = document.getElementById('content');
let orientationDegrees = 0;
let zoomRatio = 1;
let textLayerDiv = document.getElementById("text");
let task = null;

let newPageNumber = 0;
let newZoomRatio = 1;
let useRender;

const cache = [];
const maxCached = 6;

function maybeRenderNextPage() {
    if (renderPending) {
        pageRendering = false;
        renderPending = false;
        renderPage(channel.getPage(), renderPendingZoom, false);
        return true;
    }
    return false;
}

function handleRenderingError(error) {
    console.log("rendering error: " + error);

    pageRendering = false;
    maybeRenderNextPage();
}

function doPrerender(pageNumber, prerenderTrigger) {
    if (useRender) {
        if (pageNumber + 1 <= pdfDoc.numPages) {
            renderPage(pageNumber + 1, false, true, pageNumber);
        } else if (pageNumber - 1 > 0) {
            renderPage(pageNumber - 1, false, true, pageNumber);
        }
    } else if (pageNumber === prerenderTrigger + 1) {
        if (prerenderTrigger - 1 > 0) {
            renderPage(prerenderTrigger - 1, false, true, prerenderTrigger);
        }
    }
}

function display(newCanvas, zoom) {
    canvas.height = newCanvas.height;
    canvas.width = newCanvas.width;
    canvas.style.height = newCanvas.style.height;
    canvas.style.width = newCanvas.style.width;
    padding.style.width = canvas.style.width;
    canvas.getContext("2d", { alpha: false }).drawImage(newCanvas, 0, 0);
    if (!zoom) {
        scrollTo(0, 0);
    }
}

function renderPage(pageNumber, zoom, prerender, prerenderTrigger=0) {
    pageRendering = true;
    useRender = !prerender;

    newPageNumber = pageNumber;
    newZoomRatio = channel.getZoomRatio();
    orientationDegrees = channel.getDocumentOrientationDegrees();
    console.log("page: " + pageNumber + ", zoom: " + newZoomRatio +
                ", orientationDegrees: " + orientationDegrees + ", prerender: " + prerender);
    for (let i = 0; i < cache.length; i++) {
        const cached = cache[i];
        if (cached.pageNumber === pageNumber && cached.zoomRatio === newZoomRatio &&
                cache.orientationDegrees === orientationDegrees) {
            if (useRender) {
                cache.splice(i, 1);
                cache.push(cached);

                display(cached.canvas, zoom);

                textLayerDiv.replaceWith(cached.textLayerDiv);
                textLayerDiv = cached.textLayerDiv;
            }

            pageRendering = false;
            doPrerender(pageNumber, prerenderTrigger);
            return;
        }
    }

    pdfDoc.getPage(pageNumber).then(function(page) {
        if (maybeRenderNextPage()) {
            return;
        }

        const viewport = page.getViewport({scale: newZoomRatio, rotation: orientationDegrees})

        if (useRender) {
            if (newZoomRatio !== zoomRatio) {
                canvas.style.height = viewport.height + "px";
                canvas.style.width = viewport.width + "px";
            }
            zoomRatio = newZoomRatio;
        }

        if (zoom == 2) {
            pageRendering = false;
            return;
        }

        const newCanvas = document.createElement("canvas");
        const ratio = window.devicePixelRatio;
        newCanvas.height = viewport.height * ratio;
        newCanvas.width = viewport.width * ratio;
        newCanvas.style.height = viewport.height + "px";
        newCanvas.style.width = viewport.width + "px";
        const newContext = newCanvas.getContext("2d", { alpha: false });
        newContext.scale(ratio, ratio);

        task = page.render({
            canvasContext: newContext,
            viewport: viewport
        });

        task.promise.then(function() {
            task = null;

            let rendered = false;
            function render() {
                if (!useRender || rendered) {
                    return;
                }
                display(newCanvas, zoom);
                rendered = true;
            }
            render();

            const textLayerFrag = document.createDocumentFragment();
            task = pdfjsLib.renderTextLayer({
                textContentStream: page.streamTextContent(),
                container: textLayerFrag,
                viewport: viewport
            });
            task.promise.then(function() {
                task = null;

                render();

                const newTextLayerDiv = textLayerDiv.cloneNode();
                newTextLayerDiv.style.height = newCanvas.style.height;
                newTextLayerDiv.style.width = newCanvas.style.width;
                if (useRender) {
                    textLayerDiv.replaceWith(newTextLayerDiv);
                    textLayerDiv = newTextLayerDiv;
                }
                newTextLayerDiv.appendChild(textLayerFrag);

                if (cache.length === maxCached) {
                    cache.shift()
                }
                cache.push({
                    pageNumber: pageNumber,
                    zoomRatio: newZoomRatio,
                    orientationDegrees: orientationDegrees,
                    canvas: newCanvas,
                    textLayerDiv: newTextLayerDiv
                });

                pageRendering = false;
                doPrerender(pageNumber, prerenderTrigger);
            }).catch(handleRenderingError);
        }).catch(handleRenderingError);
    });
}

function onRenderPage(zoom) {
    if (pageRendering) {
        if (newPageNumber === channel.getPage() && newZoomRatio === channel.getZoomRatio() &&
                orientationDegrees === channel.getDocumentOrientationDegrees()) {
            useRender = true;
            return;
        }

        renderPending = true;
        renderPendingZoom = zoom;
        if (task !== null) {
            task.cancel();
            task = null;
        }
    } else {
        renderPage(channel.getPage(), zoom, false);
    }
}

function isTextSelected() {
    return window.getSelection().toString() !== "";
}

function updateInset() {
    const windowInsetTop = channel.getWindowInsetTop() / window.devicePixelRatio + "px";
    padding.style.paddingTop = windowInsetTop;
    textLayerDiv.style.top = windowInsetTop;
}

updateInset();

/**
 * Does an iterative breadth-first-like traversal of all of the nodes in the
 * outline tree to convert the tree so that the nodes are of a simpler form.
 * The simple outline nodes have the following structure:
 *
 * ```
 *  {
 *      title: String,
 *      pageNumber: int (-1 means unknown),
 *      children: Array of simple outline nodes,
 *  }
 * ```
 *
 * @param {Array} outline The root node of the outline tree as obtained by
 * pdfDoc.getOutline. This is assumed to be an ordered tree.
 *
 * @return {Promise} A promise that is resolved with an {Array} that contains
 * all the top-level nodes of the outline in simplified form (i.e., a simplified
 * version of the original outline).
 */
async function convertOutlineToSimplifiedOutline(outline) {
    if (outline === undefined || outline === null || outline.length === 0) {
        return null;
    }

    const pageNumberPromises = [];
    const topLevelEntries = [];

    // Each item in this queue represents a PDF.js outline node with a
    // reference to an array of its children in simple node form.
    const outlineQueue = [{
        pdfJsChildren: outline,
        // The parent's array of simple children. Items at the top/root
        // do not have a parent, so it starts out as null for them.
        parentSimpleChildrenArray: null,
    }];

    while (outlineQueue.length > 0) {
        const currentOutlinePayload = outlineQueue.shift();
        const parentChildrenArray = currentOutlinePayload.parentSimpleChildrenArray;
        const currentPdfJsChildren = currentOutlinePayload.pdfJsChildren;
        for (let i = 0; i < currentPdfJsChildren.length; i++) {
            const pdfJsChild = currentPdfJsChildren[i];

            const simpleChild = {
                title: pdfJsChild.title,
                // The pageNumber is resolved later.
                pageNumber: -1,
                children: [],
            };

            if (parentChildrenArray !== null) {
                parentChildrenArray.push(simpleChild)
            } else {
                topLevelEntries.push(simpleChild)
            }

            // Push any children of pdfJsChild to the queue.
            if (pdfJsChild.items.length > 0) {
                outlineQueue.push({
                    pdfJsChildren: pdfJsChild.items,
                    parentSimpleChildrenArray: simpleChild.children,
                });
            }

            // Resolve the page number. Note that dest options can be a string
            // or an object from the PDF spec.
            const dest = (typeof pdfJsChild.dest === "string")
                ? await pdfDoc.getDestination(pdfJsChild.dest) : pdfJsChild.dest;
            if (Array.isArray(dest)) {
                const destRef = dest[0];
                if (typeof destRef === "object") {
                    pageNumberPromises.push(
                        pdfDoc.getPageIndex(destRef).then(function(index) {
                            simpleChild.pageNumber = parseInt(index) + 1;
                        }).catch(function(error) {
                            console.log("pdfDoc.getPageIndex error: " + error);
                            simpleChild.pageNumber = -1;
                        })
                    );
                } else {
                    simpleChild.pageNumber = Number.isInteger(destRef) ? destRef + 1 : -1;
                }
            }
        }
    }

    await Promise.all(pageNumberPromises);

    return topLevelEntries;
}

pdfjsLib.getDocument("https://localhost/placeholder.pdf").promise.then(function(newDoc) {
    pdfDoc = newDoc;

    channel.setNumPages(pdfDoc.numPages);

    pdfDoc.getMetadata().then(function(data) {
        channel.setDocumentProperties(JSON.stringify(data.info));
    }).catch(function(error) {
        console.log("getMetadata error: " + error);
    });

    pdfDoc.getOutline().then(function(outline) {
        convertOutlineToSimplifiedOutline(outline).then(function(outlineEntries) {
            if (outlineEntries !== null) {
                channel.setOutline(JSON.stringify(outlineEntries));
            } else {
                channel.setOutline(null);
            }
        }).catch(function(error) {
            console.log("convertOutlineToSimplifiedOutline error: " + error);
        });
    }).catch(function(error) {
        console.log("getOutline error: " + error);
    });

    renderPage(channel.getPage(), false, false);
}).catch(function(error) {
    console.log("getDocument error: " + error);
});
