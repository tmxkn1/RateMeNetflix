var _prevDOM = null;
var _currentMovieId = '';
var _nodeToInject = null;
var _doubanMovieSearchHist = new Array();

const QUERY_SUCCESSFUL = 1;
const QUERY_WAITING = -99;
const QUERY_FUZZY = 0;
const QUERY_FAILED = -1;

function getMovieInfo(node) {    
    // insert texts to tell user that we are trying hard to get the results from Douban.
    injectRatings(node, {queryStatus: QUERY_WAITING});

    var result;
    if (node.className === 'bob-overlay') {
        result = movieInfoFromBobOverlay(node);
    } else if(node.className === 'jawBone') {
        result = movieInfoFromJawBone(node);
    }

    if (!result) {
        return;
    }

    _nodeToInject = node;

    // now let's send the message and start searching!
    doubanSearchXHR(result.searchStr, result.movieId, result.movieTitle, result.movieYear);
}

function movieInfoFromBobOverlay(node) {
    // node identity
    var movieId;
    if ((movieId = node.getElementsByClassName('bob-jaw-hitzone bob-jaw-hitzone-half')).length) {
        movieId = movieId[0].href.split('/');
        movieId = movieId[movieId.length-1];
    } else if ((movieId = node.getElementsByClassName('bob-play bob-play-top playLink')).length) {
        movieId = /\/(\d*)\?/.exec(movieId[0].href);
        movieId = movieId[1];
    }

    
    _currentMovieId = movieId;
    console.log('(netflixBrowseContent.js): movie id updated:', movieId)
    
    // check if the movie has been queried before.
    for (let i in _doubanMovieSearchHist) {
        if (_doubanMovieSearchHist[i].movieId === movieId) {
            injectRatings(node, _doubanMovieSearchHist[i]);
            return null;
        }
    }

    // find elements contain movie title and publication year
    var movieTitle = node.getElementsByClassName('bob-title');
    var movieYear = node.getElementsByClassName('year');
    var searchStr;
    // console.log('(netflixBrowseContent.js): ', movieTitle, movieYear);

    // get title
    if (movieTitle.length != 1){
        var ex = new Error('cannot get movie title.');
        chrome.runtime.sendMessage({action:'caughtEx',message:'(netflixBrowseContent.js) Error occurred in getting movie title.', exMessage: ex.message, exStack: ex.stack});
        return null;
    }
    movieTitle = movieTitle[0].textContent;
    // return if title is empty
    if (movieTitle == '')
        return null;

    // get year
    if (movieYear.length != 1){
        console.log('(netflixBrowseContent.js): year not found')
        movieYear = '';
        var ex = new Error('cannot get movie year.');
        chrome.runtime.sendMessage({action:'caughtEx',message:'(netflixBrowseContent.js) Error occurred in getting movie year.', exMessage: ex.message, exStack: ex.stack});
    } else {
        // console.log('(netflixBrowseContent.js): year found (innerText/outerText/textContent/innerHTML', movieYear[0].innerText, '/', movieYear[0].outerText, '/', movieYear[0].textContent, '/', movieYear[0].innerHTML, '/', movieYear[0].outerHTML);
        // console.log('(netflixBrowseContent.js): year found', movieYear[0].textContent);
        movieYear = movieYear[0].textContent.trim();
    }
    console.log('(netflixBrowseContent.js): Movie found:', movieTitle, movieYear);

    // replace special characters with space.
    movieTitle = movieTitle.replace(/[^\w\s]/g, ' ').trim();
    if (movieYear != '') {
        searchStr = (movieTitle + ' (' + movieYear + ')');
        
    }else {
        searchStr = movieTitle;
    }

    return {searchStr: searchStr, movieId: movieId, movieTitle: movieTitle, movieYear: movieYear};
}

function movieInfoFromJawBone(node){
    // node identity
    var movieId;
    movieId = node.getElementsByClassName('jawbone-title-link')
    movieId = movieId[0].href.split('/');
    movieId = movieId[movieId.length-1];
    
    _currentMovieId = movieId;
    console.log('(netflixBrowseContent.js): movie id updated:', movieId)
    
    // check if the movie has been queried before.
    for (let i in _doubanMovieSearchHist) {
        if (_doubanMovieSearchHist[i].movieId === movieId) {
            injectRatings(node, _doubanMovieSearchHist[i]);
            return null;
        }
    }
    
    var searchStr;
    // get movie title
    var movieTitle = node.getElementsByClassName('text');
    if (movieTitle.length !== 1){
        if ((movieTitle = node.getElementsByClassName('logo')).length !== 1) {
            var ex = new Error('cannot get movie title.');
            chrome.runtime.sendMessage({action:'caughtEx',message:'(netflixBrowseContent.js) Error occurred in getting movie title.', exMessage: ex.message, exStack: ex.stack});
            return null;
        } else {
            movieTitle = movieTitle[0].alt;
        }
    } else {
        movieTitle = movieTitle[0].textContent;
    }
    // return if title is empty
    if (movieTitle == '')
        return null;

    // get movie year
    var movieYear = node.getElementsByClassName('year');
    if (movieYear.length != 1){
        console.log('(netflixBrowseContent.js): year not found')
        movieYear = '';
        var ex = new Error('cannot get movie year.');
        chrome.runtime.sendMessage({action:'caughtEx',message:'(netflixBrowseContent.js) Error occurred in getting movie year.', exMessage: ex.message, exStack: ex.stack});
    } else {
        // console.log('(netflixBrowseContent.js): year found (innerText/outerText/textContent/innerHTML', movieYear[0].innerText, '/', movieYear[0].outerText, '/', movieYear[0].textContent, '/', movieYear[0].innerHTML, '/', movieYear[0].outerHTML);
        // console.log('(netflixBrowseContent.js): year found', movieYear[0].textContent);
        movieYear = movieYear[0].textContent.trim();
    }
    console.log('(netflixBrowseContent.js): Movie found:', movieTitle, movieYear);

    // replace special characters with space.
    movieTitle = movieTitle.replace(/[^\w\s]/g, ' ').trim();
    if (movieYear != '') {
        searchStr = (movieTitle + ' (' + movieYear + ')');        
    }else {
        searchStr = movieTitle;
    }

    return {searchStr: searchStr, movieId: movieId, movieTitle: movieTitle, movieYear: movieYear};
}

function mouseOverParser(e) {
    var srcElement = e.srcElement; 
    if (srcElement == null) {
        var ex = new Error('cannot get mouseover element.');
        chrome.runtime.sendMessage({action:'caughtEx',message:'(netflixBrowseContent.js) Error occurred in getting mouseover element.', exMessage: ex.message, exStack: ex.stack});
    }

    if (_prevDOM != srcElement){
        _prevDOM = srcElement;
    } else {
        return;
    }

    if (srcElement.className == 'video-artwork is-loaded lazy-background-image'){
        // get the span node
        let span = srcElement.parentElement.parentElement.parentElement.getElementsByTagName('span');
        // observe it
        if (span.length){
            addObserver(bobObserver, span[0], { childList: true });
        }
    } else if (srcElement.className == 'bob-jaw-hitzone bob-jaw-hitzone-half'){
        // get the jawBoneContent
        while (srcElement.parentElement.className !== 'ptrack-container') {
            srcElement = srcElement.parentElement;
        }
        addObserver(jawBoneObserver, srcElement.parentElement.getElementsByClassName('jawBoneContent')[0], { childList: true });
    }
}

// Mouse listener for any move event on the current document.
document.addEventListener('mousemove', function (e) {
    if (document.URL.includes('browse') || document.URL.includes('title') || document.URL.includes('search')) {
        mouseOverParser(e);
    } else if (document.URL.includes('watch')) {

    }

}, false);

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log('(netflixBrowseContent.js): Message received: ', request.action);
        // update movie search result list
        if (request.action === 'pushMovieSearchResults') {
            _doubanMovieSearchHist = request.content;
            console.log('(netflixBrowseContent.js): Movie search hist updated, length =', _doubanMovieSearchHist.length)
        }
    }
);

chrome.runtime.sendMessage({ action: 'updateMovieSearchResults' });