'use strict';
exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;
    const customHeaderName = 'X-Accept-Language';
    const acceptLanguage = 'Accept-Language';
    const supportedLanguages = ['en', 'es'];
    const defaultLanguage = 'en';

    const getSelectableLangugaes = function(languages){
        var selectableLanguages = [];
        languages.forEach(function(language){
            var language_data = language.split(';');

            var locale = language_data[0];
            var weight = language_data[1];

            var sanitizedLocale = locale.toLowerCase().substring(0, 2);
            // If no weight specified, default to highest weight of 1
            var sanitizedWeight = 1.0;

            if (weight) {
                // expected format: q=0.8
                sanitizedWeight = parseFloat(weight.substring(2)) || 0.0;
            }

            if (supportedLanguages.includes(sanitizedLocale)){
                selectableLanguages.push({
                    'locale': sanitizedLocale,
                    'weight': sanitizedWeight
                });
            }
        });

        return selectableLanguages;
    }

    if (headers[acceptLanguage]) {
        var selectableLanguages = getSelectableLangugaes(headers[acceptLanguage].split(','));
        var selectedLanguage = defaultLanguage;
        if(selectableLanguages.length > 0) {
            selectableLanguages.sort(function(a, b){
                return a.weight - b.weight; // Sort Ascending
            });
            selectedLanguage = selectableLanguages.pop().locale;
        }

        headers[customHeaderName] = selectedLanguage;
    }
    callback(null, request);
};
