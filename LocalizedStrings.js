/**
 * Class to localize the ReactNative interface
 *
 * Originally developed by Stefano Falda (stefano.falda@gmail.com)
 *
 * It uses a native library (ReactLocalization) to get the current interface language,
 * then display the correct language strings or the default language (the first
 * one if a match is not found).
 *
 * How to use:
 * Check the instructions at:
 * https://github.com/stefalda/ReactNativeLocalization
 */
'use strict';
import React from 'react';
import { NativeModules } from 'react-native';
var localization = NativeModules.ReactLocalization;
if (!localization) {
    console.error("Something went wrong initializing the native ReactLocalization module.\nPlease check your configuration.\nDid you run 'react-native link'?");
}

var placeholderRegex = /(\{\d+\})/;
var isReactComponent = value => typeof value.$$typeof === 'symbol';

var interfaceLanguage = localization.language.replace(/_/g, '-');
class LocalizedStrings {

    _getBestMatchingLanguage(language, props) {
        //If an object with the passed language key exists return it
        if (props[language]) return language;
        //if the string is multiple tags, try to match without the final tag
        //(en-US --> en, zh-Hans-CN --> zh-Hans)
        let idx = language.lastIndexOf("-");
        if (idx >= 0) {
            language = language.substring(0, idx);
            return this._getBestMatchingLanguage(language, props)
        }
        //Return the default language (the first coded)
        return Object.keys(props)[0];
    }


    constructor(props) {
        //Store locally the passed strings
        this.props = props;
        //Set language to its default value (the interface)
        this.setLanguage(interfaceLanguage);
    }

    //Can be used from ouside the class to force a particular language
    //indipendently from the interface one
    setLanguage(language) {
        //Check if exists a translation for the current language or if the default
        //should be used
        var bestLanguage = this._getBestMatchingLanguage(language, this.props);
        var defaultLanguage = Object.keys(this.props)[0];
        this.language = bestLanguage;
        //Associate the language object to the this object
        if (this.props[bestLanguage]) {
            var localizedStrings = Object.assign({}, this.props[defaultLanguage], this.props[this.language]);
            for (var key in localizedStrings) {
                if (localizedStrings.hasOwnProperty(key)) {
                    this[key] = localizedStrings[key];
                }
            }
            //Now add any string missing from the translation but existing in the default language
            if (defaultLanguage !== this.language) {
                localizedStrings = this.props[defaultLanguage];
                this._fallbackValues(localizedStrings, this);
            }
        }
    }

    //Load fallback values for missing translations 
    _fallbackValues(defaultStrings, strings) {
        for (var key in defaultStrings) {
            if (defaultStrings.hasOwnProperty(key) && !strings[key]) {
                strings[key] = defaultStrings[key];
                console.log("Missing localization for language '" + this.language + "' and key '" + key + "'.");
            } else {
                if (typeof strings[key] != "string") {
                    //Si tratta di un oggetto
                    this._fallbackValues(defaultStrings[key], strings[key]);
                }
            }
        }
    }

    //The current language displayed (could differ from the interface language
    // if it has been forced manually and a matching translation has been found)
    getLanguage() {
        return this.language;
    }

    //The current interface language (could differ from the language displayed)
    getInterfaceLanguage() {
        return interfaceLanguage;
    }

    //Return an array containing the available languages passed as props in the constructor
    getAvailableLanguages() {
        if (!this.availableLanguages) {
            this.availableLanguages = [];
            for (let language in this.props) {
                this.availableLanguages.push(language);
            }
        }
        return this.availableLanguages;
    }

    //Format the passed string replacing the numbered placeholders
    //i.e. I'd like some {0} and {1}, or just {0}
    //Use example:
    //  strings.formatString(strings.question, strings.bread, strings.butter)
    formatString(str, ...valuesForPlaceholders) {
        return str
            .split(placeholderRegex)
            .filter(textPart => !!textPart)
            .map((textPart, index) => {
                if (textPart.match(placeholderRegex)) {
                    const valueForPlaceholder = valuesForPlaceholders[textPart.slice(1, -1)];
                    return isReactComponent(valueForPlaceholder)
                        ? React.Children.toArray(valueForPlaceholder).map(component => ({...component, key: index.toString()}))
                        : valueForPlaceholder;
                }
                return textPart;
            });
    }

    //Return a string with the passed key in a different language 
    getString(key, language) {
        try {
            return this.props[language][key];
        } catch (ex) {
            console.log("No localization found for key " + key + " and language " + language);
        }
        return null;
    }
}
module.exports = LocalizedStrings;
