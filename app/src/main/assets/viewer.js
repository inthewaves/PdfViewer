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

async function getPageNumberFromDest(dest) {
    try {
        const index = await pdfDoc.getPageIndex(dest[0]);
        return parseInt(index) + 1;
    } catch (error) {
        console.log("getPageNumberFromDest error: " + error);
        return -1;
    }
}

/**
 * Does an iterative breadth-first traversal of all of the nodes in the
 * outline tree, adding the nodes to an array. Since the outline tree is
 * ordered, the keys in each node will be sorted as well. This function only
 * returns the list of all possible nodes; it does not link children to parent
 * nodes.
 *
 * @param {Array} outline The root node of the outline tree as obtained by
 * pdfDoc.getOutline. This is assumed to be an ordered tree.
 *
 * @return {Promise} A promise that is resolved with an {Array} that contains
 * all the nodes in the tree in a simplified format. The parents don't know
 * who their children are, but the children know who their parents are.
 * The linking of parents to their children are done in Java.
 */
async function breadthFirstTraversal(outline) {
    if (outline === undefined || outline === null || outline.length == 0) {
        return null;
    }

    const pageNumberPromises = [];
    const outlineEntries = [];

    // Items at the top/root do not have a parent.
    const outlineQueue = [{
        items: outline,
        parentIndex: -1,
    }];

    console.log("breadthFirstTraversal: begin");
    while (outlineQueue.length > 0) {
        let currentOutlinePayload = outlineQueue.shift();

        // The current tree node we will iterate through.
        let currentOutline = currentOutlinePayload.items;

        // The list item that is the parent of all the nodes inside of the currentOutline array.
        let currentParent = currentOutlinePayload.parentIndex;

        for (let i = 0; i < currentOutline.length; i++) {
            // Push any children of currentOutline[i] to the stack.
            if (currentOutline[i].items.length > 0) {
                outlineQueue.push({
                    items: currentOutline[i].items,
                    // Since we don't push to outlineEntries until after this push,
                    // this is the correct index for the parent.
                    parentIndex: outlineEntries.length,
                });
            }

            // Aiming to push every node in the tree into a single list.
            // We will add the page numbers after.
            const currentPagePromise = pdfDoc.getPageIndex(currentOutline[i].dest[0]).then(
                function(index) {
                    return parseInt(index) + 1;
                }).catch(function(error) {
                    console.log("pdfDoc.getPageIndex error: " + error);
                    return -1;
                });;
            pageNumberPromises.push(currentPagePromise);

            outlineEntries.push({
                title: currentOutline[i].title,
                pageNumber: -1,
                parentIndex: currentParent,
            });
        }
    }

    // Add in the page numbers after the getPageIndex promises are all done.
    const promiseAll = Promise.all(pageNumberPromises).then(function(pageNumbers) {
        for (let i = 0; i < outlineEntries.length; i++) {
            outlineEntries[i].pageNumber = pageNumbers[i];
        }
    });
    await promiseAll;

    return outlineEntries;
}

let numPushes = 0;

async function parseOutline(outline) {
    if (outline === null) {
        return null;
    }

    const outlineEntries = [];

    for (let i = 0; i < outline.length; i++) {
        let nestedOutlineEntry = null;
        if (outline[i].items.length > 0) {
            nestedOutlineEntry = await parseOutline(outline[i].items);
        }

        numPushes = numPushes + 1;
        outlineEntries.push({
            title: outline[i].title,
            pageNumber: await getPageNumberFromDest(outline[i].dest),
            children: nestedOutlineEntry,
        });
    }

    return outlineEntries;
}

pdfjsLib.getDocument("https://localhost/placeholder.pdf").promise.then(function(newDoc) {
    numPushes = 0;
    pdfDoc = newDoc;

    channel.setNumPages(pdfDoc.numPages);
    pdfDoc.getMetadata().then(function(data) {
        channel.setDocumentProperties(JSON.stringify(data.info));
    }).catch(function(error) {
        console.log("getMetadata error: " + error);
    });


    /*
        Times:
        - 21:24:54.753 to 21:24:57.531
        -
     */
    pdfDoc.getOutline().then(function(outline) {
        // https://github.com/mozilla/pdf.js/blob/a6db0457893b7bc960d63a8aa07b9091ddea84e0/src/display/api.js#L703-L722
        console.log("outline is " + JSON.stringify(outline))
        console.log("breadthFirstTraversal: beginning conversion");
        breadthFirstTraversal(outline).then(function(outlineEntries) {
            console.log("breadthFirstTraversal done: " + JSON.stringify(outlineEntries));
            console.log("size is " + outlineEntries.length);
            channel.setOutline(JSON.stringify(outlineEntries));
        }).catch(function(error) {
            console.log("breadthFirstTraversal error: " + error);
        });;
    }).catch(function(error) {
        console.log("getOutline error: " + error);
    });


    /*
        Times:
        - 21:01:43.593 to 21:01:46.250
        - 21:06:26.748 to 21:06:29.471
        - 21:07:20.218 to 21:07:23.081
        - 21:07:56.492 to 21:07:59.288
        - 21:22:23.391 to 21:22:26.070
     */
    /*
    pdfDoc.getOutline().then(function(outline) {
            // https://github.com/mozilla/pdf.js/blob/a6db0457893b7bc960d63a8aa07b9091ddea84e0/src/display/api.js#L703-L722
            console.log("parseOutline: beginning conversion");
            parseOutline(outline).then(function(outlineEntries) {
                console.log("parseOutline: finished conversion: " + JSON.stringify(outlineEntries));
                console.log("parseOutline: size is " + numPushes);
            });
        }).catch(function(error) {
            console.log("getOutline error: " + error);
        });
    */

    renderPage(channel.getPage(), false, false);
}).catch(function(error) {
    console.log("getDocument error: " + error);
});
