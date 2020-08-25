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

async function getPageNumberFromDestString(destString) {
    try {
        const index = await pdfDoc.getPageIndex(destString[0]);
        return parseInt(index) + 1;
    } catch (error) {
        console.log("getPageNumberFromDestString error: " + error);
        return -1;
    }
}

async function printOutline(outline, indent) {
    try {
        for (let i = 0; i < outline.length; i++) {
            console.log("printOutline: " + indent + "outline[" + i + "]: " + outline[i].title
                + ", " + await getPageNumberFromDestString(outline[i].dest));

            if (outline[i].items.length > 0) {
                printOutline(outline[i].items, indent.length == 0 ? "-> " : " " + indent);
            }
        }
    } catch (error) {
        console.log("printOutline error: " + error);
    }
}

async function parseOutline(outline) {
    const outlineEntries = [];

    for (let i = 0; i < outline.length; i++) {
        let nestedOutlineEntry = null;
        if (outline[i].items.length > 0) {
            // console.log("printOutline: Trying to recurse");
            console.log("I HAVE CHILDREN");
            nestedOutlineEntry = await parseOutline(outline[i].items);
        }

        outlineEntries.push({
            title: outline[i].title,
            pageNumber: await getPageNumberFromDestString(outline[i].dest),
            children: nestedOutlineEntry,
        });
    }

    console.log("The payload now: " + JSON.stringify(outlineEntries) );
    return outlineEntries;
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
        // https://github.com/mozilla/pdf.js/blob/a6db0457893b7bc960d63a8aa07b9091ddea84e0/src/display/api.js#L703-L722
        channel.setOutline(JSON.stringify(outline));

        parseOutline(outline).then(function(outlineEntries) {
            console.log("outlineEntries: " + JSON.stringify(outlineEntries));
        });

        /*
        const dest = outline[0].dest
        console.log("getOutline dest: " + dest);
        pdfDoc.getDestination(dest).then(function(getDest) {
            console.log("getOutline getDest: " + getDest);

            pdfDoc.getPageIndex(getDest[0]).then(function(index) {
                console.log("getOutline getPageIndex: " + index);
            }).catch(function(error) {
                console.log("getOutline error: " + error);
            });
        }).catch(function(error) {
            console.log("getOutline error: " + error);
        });
        */

    }).catch(function(error) {
        console.log("getOutline error: " + error);
    });


    /// https://medium.com/@cpreager/a-slightly-updated-version-56466f1d30ba
    const toc = [];
    console.log("Saving table of contents");
    pdfDoc
        .getOutline()
        .then(
            function(outline) {
                let lastPromise = Promise.resolve(); // will be used to chain promises
                if (outline) {
                    const getTOCEntry = function(i) {
                        const dest = outline[i].dest;
                        return new Promise((resolve, reject) => {
                            if (typeof dest === "string") {
                                console.log("I am a string");
                                this.pdfDoc.getDestination(dest).then(destArray => {
                                    resolve(destArray);
                                });
                                return;
                            }
                            resolve(dest);
                        }).then(explicitDest => {
                            // Dest array looks like that: <page-ref> </XYZ|/FitXXX> <args..>
                            const destRef = explicitDest[0];
                            if (destRef instanceof Object) {
                                return pdfDoc
                                    .getPageIndex(destRef)
                                    .then(pageIndex => {
                                        toc.push({
                                            title: outline[i]["title"],
                                            pageNumber: parseInt(pageIndex) + 1,
                                        });
                                    })
                                    .catch(() => {
                                        console.error(
                                            `${destRef}" not a valid page reference for dest ${dest}`
                                        );
                                    });
                            }
                        });
                    };
                    for (let i = 0; i < outline.length; i++) {
                        lastPromise = lastPromise.then(getTOCEntry.bind(null, i));
                    }
                }
                return lastPromise;
            },
            function(err) {
                console.error("Error", err);
            }
        )
        .then(function() {
            console.log(JSON.stringify(toc));
        });


    renderPage(channel.getPage(), false, false);
}).catch(function(error) {
    console.log("getDocument error: " + error);
});
