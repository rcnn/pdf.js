/* Copyright 2015 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  createBlob, createObjectURL, createPromiseCapability, InvalidPDFException,
  isLittleEndian, MissingPDFException, OPS, PageViewport, PasswordException,
  PasswordResponses, removeNullCharacters, shadow, UnexpectedResponseException,
  UnknownErrorException, UNSUPPORTED_FEATURES, Util
} from '../shared/util';
import { DEFAULT_LINK_REL, getFilenameFromUrl, LinkTarget } from './dom_utils';
import {
  getDocument, LoopbackPort, PDFDataRangeTransport, PDFWorker
} from './api';
import { AnnotationLayer } from './annotation_layer';
import globalScope from '../shared/global_scope';
import { GlobalWorkerOptions } from './worker_options';
import { Metadata } from './metadata';
import { renderTextLayer } from './text_layer';
import { SVGGraphics } from './svg';

// The global PDFJS object is now deprecated and will not be supported in
// the future. The members below are maintained for backward  compatibility
// and shall not be extended or modified. If the global.js is included as
// a module, we will create a global PDFJS object instance or use existing.
if (!globalScope.PDFJS) {
  globalScope.PDFJS = {};
}
var PDFJS = globalScope.PDFJS;

PDFJS.pdfBug = false;

PDFJS.OPS = OPS;
PDFJS.UNSUPPORTED_FEATURES = UNSUPPORTED_FEATURES;
PDFJS.shadow = shadow;
PDFJS.createBlob = createBlob;
PDFJS.createObjectURL = function PDFJS_createObjectURL(data, contentType) {
  return createObjectURL(data, contentType, PDFJS.disableCreateObjectURL);
};
Object.defineProperty(PDFJS, 'isLittleEndian', {
  configurable: true,
  get: function PDFJS_isLittleEndian() {
    return shadow(PDFJS, 'isLittleEndian', isLittleEndian());
  },
});
PDFJS.removeNullCharacters = removeNullCharacters;
PDFJS.PasswordResponses = PasswordResponses;
PDFJS.PasswordException = PasswordException;
PDFJS.UnknownErrorException = UnknownErrorException;
PDFJS.InvalidPDFException = InvalidPDFException;
PDFJS.MissingPDFException = MissingPDFException;
PDFJS.UnexpectedResponseException = UnexpectedResponseException;
PDFJS.Util = Util;
PDFJS.PageViewport = PageViewport;
PDFJS.createPromiseCapability = createPromiseCapability;

/**
 * The maximum allowed image size in total pixels e.g. width * height. Images
 * above this value will not be drawn. Use -1 for no limit.
 * @var {number}
 */
PDFJS.maxImageSize = (PDFJS.maxImageSize === undefined ?
                      -1 : PDFJS.maxImageSize);

/**
 * The url of where the predefined Adobe CMaps are located. Include trailing
 * slash.
 * @var {string}
 */
PDFJS.cMapUrl = (PDFJS.cMapUrl === undefined ? null : PDFJS.cMapUrl);

/**
 * Specifies if CMaps are binary packed.
 * @var {boolean}
 */
PDFJS.cMapPacked = PDFJS.cMapPacked === undefined ? false : PDFJS.cMapPacked;

/**
 * By default fonts are converted to OpenType fonts and loaded via font face
 * rules. If disabled, the font will be rendered using a built in font
 * renderer that constructs the glyphs with primitive path commands.
 * @var {boolean}
 */
PDFJS.disableFontFace = (PDFJS.disableFontFace === undefined ?
                         false : PDFJS.disableFontFace);

/**
 * Disable range request loading of PDF files. When enabled and if the server
 * supports partial content requests then the PDF will be fetched in chunks.
 * Enabled (false) by default.
 * @var {boolean}
 */
PDFJS.disableRange = (PDFJS.disableRange === undefined ?
                      false : PDFJS.disableRange);

/**
 * Disable streaming of PDF file data. By default PDF.js attempts to load PDF
 * in chunks. This default behavior can be disabled.
 * @var {boolean}
 */
PDFJS.disableStream = (PDFJS.disableStream === undefined ?
                       false : PDFJS.disableStream);

/**
 * Disable pre-fetching of PDF file data. When range requests are enabled
 * PDF.js will automatically keep fetching more data even if it isn't needed
 * to display the current page. This default behavior can be disabled.
 *
 * NOTE: It is also necessary to disable streaming, see above,
 *       in order for disabling of pre-fetching to work correctly.
 * @var {boolean}
 */
PDFJS.disableAutoFetch = (PDFJS.disableAutoFetch === undefined ?
                          false : PDFJS.disableAutoFetch);

/**
 * Enables special hooks for debugging PDF.js.
 * @var {boolean}
 */
PDFJS.pdfBug = (PDFJS.pdfBug === undefined ? false : PDFJS.pdfBug);

/**
 * Disables URL.createObjectURL usage.
 * @var {boolean}
 */
PDFJS.disableCreateObjectURL = (PDFJS.disableCreateObjectURL === undefined ?
                                false : PDFJS.disableCreateObjectURL);

/**
 * Specifies the |target| attribute for external links.
 * The constants from {LinkTarget} should be used:
 *  - NONE [default]
 *  - SELF
 *  - BLANK
 *  - PARENT
 *  - TOP
 * @var {number}
 */
PDFJS.externalLinkTarget = (PDFJS.externalLinkTarget === undefined ?
                            LinkTarget.NONE : PDFJS.externalLinkTarget);

/**
 * Specifies the |rel| attribute for external links. Defaults to stripping
 * the referrer.
 * @var {string}
 */
PDFJS.externalLinkRel = (PDFJS.externalLinkRel === undefined ?
                         DEFAULT_LINK_REL : PDFJS.externalLinkRel);

/**
  * Determines if we can eval strings as JS. Primarily used to improve
  * performance for font rendering.
  * @var {boolean}
  */
PDFJS.isEvalSupported = (PDFJS.isEvalSupported === undefined ?
                         true : PDFJS.isEvalSupported);

PDFJS.getDocument = getDocument;
PDFJS.LoopbackPort = LoopbackPort;
PDFJS.PDFDataRangeTransport = PDFDataRangeTransport;
PDFJS.PDFWorker = PDFWorker;
PDFJS.GlobalWorkerOptions = GlobalWorkerOptions;

PDFJS.getFilenameFromUrl = getFilenameFromUrl;

PDFJS.AnnotationLayer = AnnotationLayer;

PDFJS.renderTextLayer = renderTextLayer;

PDFJS.Metadata = Metadata;

PDFJS.SVGGraphics = SVGGraphics;

export {
  globalScope,
  PDFJS,
};
