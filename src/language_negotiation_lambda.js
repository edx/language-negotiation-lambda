'use strict';
exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;
    const customHeaderName = 'X-Accept-Language';
    const acceptLanguage = 'Accept-Language';
    const supportedLanguages = ['en', 'es'];
    const defaultLanguage = 'en';

    const sanitizeLocale = function(rawLocale){
        return rawLocale.toLowerCase().substring(0, 2);
    }

    const getLocale = function(selectableLanguages){
        if(selectableLanguages.length > 0) {
            return selectableLanguages.pop().locale;
        }
    }

    const parseAcceptLanguage = function(languageStr){
        var sanitizedLanguages = [],
            languages;

        languages = languageStr.split(',');
        languages.forEach(function(language){
            var languageData = language.split(';');

            var locale = languageData[0];
            var weight = languageData[1];

            var sanitizedLocale = sanitizeLocale(locale);
            // If no weight specified, default to highest weight of 1
            var sanitizedWeight = 1.0;

            if (weight) {
                // expected format: q=0.8
                sanitizedWeight = parseFloat(weight.substring(2)) || 0.0;
            }

            sanitizedLanguages.push({
                'locale': sanitizedLocale,
                'weight': sanitizedWeight
            });
        });

        return sanitizedLanguages;
    }

    const getSelectableLanguages = function(languages){
        var selectableLanguages = [];
        languages.forEach(function(language){
            if (supportedLanguages.indexOf(language.locale) >= 0){
                selectableLanguages.push(language);
            }
        });

        return selectableLanguages;
    }

    const getCookieLanguage = function(cookies) {
        var languageCookieName,
            languageCookieValue,
            locales,
            regexp;

        try{
            languageCookieName = process.env.LANGUAGE_COOKIE_NAME;
            // Regex from https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie#Example_2_Get_a_sample_cookie_named_test2
            regexp = new RegExp("(?:(?:^|.*;\\s*)" + languageCookieName + "\\s*\\=\\s*([^;]*).*$)|^.*$");
            locales = [];
            if(cookies){
                cookies.forEach(function(cookiesStr){
                    languageCookieValue = cookiesStr.replace(regexp, "$1");
                    locales.push({ locale: sanitizeLocale(languageCookieValue) });
                });
            }

            return getLocale(getSelectableLanguages(locales));
        } catch(err){
            console.log("Error fetching cookie data: " + err);
        }
    }

    const getBrowserLanguage = function(languageHeaders) {
        var selectableLanguages = [];

        try{
            if (languageHeaders) {
                languageHeaders.forEach(function(languageStr){
                    var languages = parseAcceptLanguage(languageStr);
                    var selectable = getSelectableLanguages(languages);
                    selectableLanguages = selectableLanguages.concat(selectable);
                });

                selectableLanguages.sort(function(a, b){
                    return a.weight - b.weight; // Sort Ascending
                });
                return getLocale(selectableLanguages);
            }
        } catch(err) {
            console.log("Error fetching Accept-Language data: " + err);
        }
    }

    const run = function() {
        var cookieLanguage,
            browserLanguage,
            selectedLanguage;

        // Always set a default first in case we hit an error case.
        headers[customHeaderName] = [defaultLanguage];

        // Fetch the cookie
        cookieLanguage = getCookieLanguage(headers.Cookie);

        // Fetch the browser language
        browserLanguage = getBrowserLanguage(headers[acceptLanguage]);

        // Set selected language in priortity order
        selectedLanguage = cookieLanguage || browserLanguage || defaultLanguage;
        headers[customHeaderName] = [selectedLanguage];
    }

    // Run main language negotiation method
    try {
        run();
    } catch(err) {
        console.log("Error performing language negotiation: " + err);
    } finally {
        callback(null, request);
    }
};
