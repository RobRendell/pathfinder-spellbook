
String.prototype.toId = function() {
    return this.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

String.prototype.toTitleCase = function () {
    return this.replace(/\w\S*/g, function (match) {
        return match.charAt(0).toUpperCase() + match.substr(1).toLowerCase();
    });
}

if (!String.prototype.trim) {
    String.prototype.trim = function () {
        return this.replace(/^\s+|\s+$/g, '');
    };
}

Number.prototype.ordinal = function () {
    var suffix = ["th","st","nd","rd"];
    var value = this % 100;
    return this + (suffix[(value-20)%10] || suffix[value] || suffix[0]);
}

Array.prototype.uniq = function () {
    var result = [];
    for (var index = 0; index < this.length; ++index) {
        if (index == 0 || this[index] !== this[index - 1]) {
            result.push(this[index]);
        }
    }
    return result;
}

$.fn.presence = function () {
    return this.length !== 0 && this;
}

$.fn.setVisible = function (visible) {
    if (visible) {
        this.show();
    } else {
        this.hide();
    }
}

var Class = {
    create: function(settings) {
        var newClass = function() {
            this.init.apply(this, arguments);
        }
        newClass.prototype.init = function() {};
        $.extend(newClass.prototype, settings);
        return newClass;
    }
};

var Storage = Class.create({

    currentVersion: 1,

    init: function (name, basePrefix) {
        this.basePrefix = basePrefix || 'pathfinder.spellbook.';
        this.name = name || '';
        this.prefix = this.basePrefix + this.name + '.';
        this.updaters = [];
        if (!this.supportsLocalStorage())
        {
            this.data = {};
            this.isLocalStorage = false;
            alert("Local storage not available in your browser - changes will be lost when you leave.");
        }
        else
        {
            this.data = localStorage;
            this.isLocalStorage = true;
        }
    },

    supportsLocalStorage: function() {
        return ('localStorage' in window && window['localStorage'] !== null);
    },

    setDefault: function (name, value) {
        if (this.get(name) === undefined) {
            this.set(name, value);
        }
    },

    set: function (name, value) {
        this.data[this.prefix + name] = JSON.stringify(value);
    },

    get: function (name, defaultValue) {
        var value = this.data[this.prefix + name];
        if (value === undefined) {
            return defaultValue;
        } else {
            return JSON.parse(value);
        }
    },

    clear: function (name) {
        var value = this.data[this.prefix + name];
        if (this.isLocalStorage)
            this.data.removeItem(this.prefix + name);
        else
            delete(this.data[this.prefix + name]);
        return value;
    },

    clearAll: function () {
        var keys = this.getKeys();
        $.each(keys, $.proxy(function (index, key) {
            this.clear(key);
        }, this));
    },

    getKeys: function () {
        if (this.isLocalStorage)
        {
            var result = [];
            for (var index = 0; index < this.data.length; ++index)
            {
                var key = this.data.key(index);
                if (key.indexOf(this.prefix) == 0)
                {
                    key = key.substring(this.prefix.length);
                    result.push(key);
                }
            }
            return result;
        }
        else
            return Object.keys(this.data);
    },

    changeId: function (oldId, newId, remove) {
        var keys = this.getKeys();
        $.each(keys, $.proxy(function (index, key)
        {
            if (key.indexOf(oldId) == 0)
            {
                var value = this.clear(key)
                if (!remove)
                {
                    var newKey = newId + key.substring(oldId.length);
                    this.set(newKey, value);
                }
            }
        }, this));
    },

    renameName: function (name) {
        name = name || '';
        var oldPrefix = this.name.toId() + '.';
        var newPrefix = name.toId() + '.';
        this.prefix = this.basePrefix;
        this.changeId(oldPrefix, newPrefix, false);
        this.setName(name);
    },

    setName: function (name) {
        name = name || '';
        this.name = name;
        this.prefix = this.basePrefix + this.name.toId() + '.';
        this.updateData();
    },

    removeName: function () {
        var oldPrefix = this.name.toId() + '.';
        this.prefix = this.basePrefix;
        this.changeId(oldPrefix, '', true);
    },

    setUpdater: function (version, updater) {
        this.updaters[version] = updater;
        if (this.currentVersion <= version) {
            this.currentVersion = version + 1;
        }
    },

    updateData: function () {
        var loadVersion = this.get('version') || 1;
        while (loadVersion < this.currentVersion) {
            var updater = this.updaters[loadVersion];
            if (updater) {
                $.each(this.getKeys(), $.proxy(function (index, oldKey) {
                    var update = updater(oldKey, this.get(oldKey));
                    if (update) {
                        this.clear(oldKey)
                        this.set(update[0], update[1]);
                    }
                }, this));
            }
            loadVersion++;
        }
        this.set('version', this.currentVersion);
    }

});

var SpellData = Class.create({

    fixedHeadings: [ 'name', 'school', 'subschool', 'descriptor',
        'spell_level', 'casting_time', 'components', 'costly_components',
        'range', 'area', 'effect', 'targets', 'duration', 'dismissible',
        'shapeable', 'saving_throw', 'spell_resistence', 'description',
        'description_formated', 'source', 'full_text', 'verbal', 'somatic',
        'material', 'focus', 'divine_focus', 'deity', 'SLA_Level', 'domain',
        'short_description', 'acid', 'air', 'chaotic', 'cold', 'curse',
        'darkness', 'death', 'disease', 'earth', 'electricity', 'emotion',
        'evil', 'fear', 'fire', 'force', 'good', 'language_dependent',
        'lawful', 'light', 'mind_affecting', 'pain', 'poison', 'shadow',
        'sonic', 'water', 'linktext', 'id', 'material_costs', 'bloodline',
        'patron', 'mythic_text', 'augmented', 'mythic' ],

    schools: [ 'Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy',
        'Transmutation' ],

    init: function (headings, rawData, progressFn) {
        this.headings = headings;
        this.rawData = rawData;
        this.classNames = { 'wiz': 'Wizard', 'sor': 'Sorcerer'};
        $.each(headings, $.proxy(function (index, value) {
            if ($.inArray(value, this.fixedHeadings) < 0) {
                if (!this.classNames[value]) {
                    this.classNames[value] = value.toTitleCase();
                }
            }
        }, this));
        this.classHeadings = Object.keys(this.classNames).sort()
        // Lots of later books add Core and APG spells to their new classes, bloodlines and domains.
//        this.classesForSources = {
//            'PFRPG Core': [ 'adept', 'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sor', 'wiz' ],
//            'APG': [ 'alchemist', 'inquisitor', 'oracle', 'summoner', 'witch' ]
//        };
//        this.bloodlinesForSources = {
//            'PFRPG Core': [ 'Aberrant', 'Abyssal', 'Arcane', 'Celestial', 'Destined', 'Draconic', 'Elemental', 'Fey',
//                'Infernal', 'Undead' ],
//            'APG': [ 'Aquatic', 'Boreal', 'Deepearth', 'Dreamspun', 'Protean', 'Serpentine', 'Shadow', 'Starsoul',
//                'Stormborn', 'Verdant' ]
//        };
//        this.domainsForSources = {
//            'PFRPG Core': [ 'Air', 'Animal', 'Artifice', 'Chaos', 'Charm', 'Community', 'Darkness', 'Death',
//                'Destruction', 'Earth', 'Evil', 'Fire', 'Glory', 'Good', 'Healing', 'Knowledge', 'Law', 'Liberation',
//                'Luck', 'Madness', 'Magic', 'Nobility', 'Plant', 'Protection', 'Repose', 'Rune', 'Strength', 'Sun',
//                'Travel', 'Trickery', 'War', 'Water', 'Weather' ],
//            'APG': [ 'Agathion', 'Ancestors', 'Arcane', 'Archon', 'Ash', 'Azata', 'Blood', 'Catastrophe', 'Caves',
//                'Cloud', 'Construct', 'Curse', 'Daemon', 'Day', 'Decay', 'Deception', 'Defense', 'Demon', 'Devil',
//                'Divine', 'Exploration', 'Family', 'Fate', 'Feather', 'Ferocity', 'Freedom', 'Fur', 'Growth',
//                'Heroism', 'Home', 'Honor', 'Ice', 'Inevitable', 'Insanity', 'Language', 'Leadership', 'Light',
//                'Loss', 'Love', 'Lust', 'Martyr', 'Memory', 'Metal', 'Murder', 'Night', 'Nightmare', 'Oceans',
//                'Protean', 'Purity', 'Rage', 'Resolve', 'Restoration', 'Resurrection', 'Revolution', 'Seasons',
//                'Smoke', 'Souls', 'Storms', 'Tactics', 'Thievery', 'Thought', 'Toil', 'Trade', 'Undead', 'Wards',
//                'Wind' ]
//        };
//        this.patronsForSources = {
//            'PFRPG Core': [],
//            'APG': [ 'Agility', 'Animals', 'Deception', 'Elements', 'Endurance', 'Plague', 'Shadow', 'Strength',
//                'Transformation', 'Trickery', 'Water', 'Wisdom' ]
//        };
        // TODO
        this.classesForSources = {};
        this.domainsForSources = {};
        this.bloodlinesForSources = {};
        this.patronsForSources = {};
        this.spellById = {};
        this.domainCoverage = {};
        this.buildResultMapsForSources(progressFn, [
            [ this.classesForSources, $.proxy(this.getClassLevelsFromSpell, this) ],
            [ this.domainsForSources, $.proxy(this.getDomainsFromSpell, this) ],
            [ this.bloodlinesForSources, $.proxy(this.getBloodlinesFromSpell, this) ],
            [ this.patronsForSources, $.proxy(this.getPatronsFromSpell, this) ]
        ]);
        this.sources = Object.keys(this.classesForSources).sort($.proxy(this.sourceSort, this));
        this.domains = this.valuesFromSourceMap(this.domainsForSources).sort();
        this.bloodlines = this.valuesFromSourceMap(this.bloodlinesForSources).sort();
        this.patrons = this.valuesFromSourceMap(this.patronsForSources).sort();
        this.subdomains = {};
        $.each(this.domainCoverage, $.proxy(function (domain, coverage) {
            this.subdomains[domain] = (Object.keys(coverage).length < 9);
        }, this));
        // Sanity check
//        var thisclassesForSources = {};
//        var thisdomainsForSources = {};
//        var thisbloodlinesForSources = {};
//        var thispatronsForSources = {};
//        this.spellById = {};
//        this.buildResultMapsForSources(progressFn, [
//            [ thisclassesForSources, $.proxy(this.getClassLevelsFromSpell, this) ],
//            [ thisdomainsForSources, $.proxy(this.getDomainsFromSpell, this) ],
//            [ thisbloodlinesForSources, $.proxy(this.getBloodlinesFromSpell, this) ],
//            [ thispatronsForSources, $.proxy(this.getPatronsFromSpell, this) ]
//        ]);
//        var domains = this.valuesFromSourceMap(thisdomainsForSources).sort();
//        var bloodlines = this.valuesFromSourceMap(thisbloodlinesForSources).sort();
//        var patrons = this.valuesFromSourceMap(thispatronsForSources).sort();
//        console.log(`domains: actual ${domains.length} vs correct core/apg ${this.domains.length}`);
//        console.log(`bloodlines: actual ${bloodlines.length} vs correct core/apg ${this.bloodlines.length}`);
//        console.log(`patrons: actual ${patrons.length} vs correct core/apg ${this.patrons.length}`);
    },

    getClassLevelsFromSpell: function (spell, map) {
        if (!map) {
            map = {};
        }
        $.each(this.classHeadings, function (index, classHeading) {
            if (spell[classHeading] === 'NULL' || spell[classHeading] === undefined) {
                spell[classHeading] = undefined;
            } else {
                spell[classHeading] = parseInt(spell[classHeading]);
                var value = spell[classHeading];
                if (!map[classHeading] || value > map[classHeading]) {
                    map[classHeading] = value;
                }
            }
        });
        return map;
    },

    getDomainsFromSpell: function (spell, map) {
        return this.getLevelsFromSpellField(spell, 'domain', map, $.proxy(function (spell, domain, level) {
            if (!this.domainCoverage[domain]) {
                this.domainCoverage[domain] = {};
            }
            this.domainCoverage[domain][level] = true;
        }, this));
    },

    getBloodlinesFromSpell: function (spell, map) {
        return this.getLevelsFromSpellField(spell, 'bloodline', map);
    },

    getPatronsFromSpell: function (spell, map) {
        return this.getLevelsFromSpellField(spell, 'patron', map);
    },

    getLevelsFromSpellField: function (spell, fieldName, map, extraFn) {
        if (!map) {
            map = {};
        }
        if (spell[fieldName]) {
            if ($.type(spell[fieldName]) == 'string') {
                var parsed = {};
                $.each(spell[fieldName].split(/, */), function (index, value) {
                    var keyValueArray = value.match(/([^()]*?) \(([0-9]*)\)/);
                    if (keyValueArray) {
                        var name = keyValueArray[1];
                        var value = parseInt(keyValueArray[2]);
                        parsed[name] = value;
                        spell[`${fieldName.toTitleCase()}: ${name}`] = value;
                        if (extraFn) {
                            extraFn(spell,name, value);
                        }
                    } else {
                        console.error(`Field ${fieldName} of spell ${spell.name} did not match expected pattern: ${value}`);
                    }
                });
                spell[fieldName] = parsed;
            }
            $.each(spell[fieldName], function (key, value) {
                if (!map[key] || value > map[key]) {
                    map[key] = value;
                }
            });
        }
        return map;
    },

    buildResultMapsForSources: function (progressFn, resultMapsAndFnList) {
        $.each(this.rawData, $.proxy(function (index, spell) {
            this.spellById[spell.name.toId()] = spell;
            $.each(resultMapsAndFnList, function (index, resultMapAndFn) {
                var resultMap = resultMapAndFn[0];
                var resultFn = resultMapAndFn[1];
                if (!resultMap[spell.source]) {
                    resultMap[spell.source] = {}
                }
                if (!$.isArray(resultMap[spell.source])) {
                    resultFn(spell, resultMap[spell.source]);
                }
            });
            if (progressFn) {
                progressFn(index);
            }
        }, this));
        $.each(resultMapsAndFnList, function (index, resultMapAndFn) {
            var resultMap = resultMapAndFn[0];
            $.each(resultMap, function (source, value) {
                if (!$.isArray(value)) {
                    resultMap[source] = Object.keys(value);
                }
            });
        });
    },

    sourceSort: function (o1, o2) {
        o1 = this.sourceMunge(o1)
        o2 = this.sourceMunge(o2)
        if (o1 < o2) {
            return -1;
        } else if (o1 > o2) {
            return 1;
        } else {
            return 0;
        }
    },

    sourceMunge: function (sourceName) {
        if (sourceName == 'PFRPG Core') {
            return 'AAAA ';
        } else if (sourceName == 'APG') {
            return 'AAAB ';
        } else if (sourceName.startsWith('Ultimate ')) {
            return 'AAAC ' + sourceName;
        } else if (sourceName.startsWith('Advanced ')) {
            return 'AAAD ' + sourceName;
        } else {
            return sourceName;
        }
    },

    valuesFromSourceMap: function (sourceMap, sourceList) {
        var result = {};
        if (!sourceList) {
            sourceList = Object.keys(sourceMap);
        }
        $.each(sourceList, $.proxy(function (index, source) {
            $.each(sourceMap[source], function (index, value) {
                result[value] = 1;
            });
        }, this));
        return Object.keys(result);
    },

    getClassHeadingsForSources: function (sourceList) {
        return this.valuesFromSourceMap(this.classesForSources, sourceList);
    }

});

var BookKeys = {
    keyBookIDs: 'bookIDs',
    keyBookName: 'bookName',
    keyCurrentBookID: 'currentBookID',
    keyPanelHistory: 'panelHistory',
    keySelectedSources: 'selectedSources',
    keySelectedClasses: 'selectedClasses',
    keySelectedBloodlines: 'selectedBloodlines',
    keySelectedDomains: 'selectedDomains',
    keySelectedPatrons: 'selectedPatrons',
    keySelectedSchools: 'selectedSchools',
    keyCategoryAssociations: 'categoryAssociations',
    keyClassSlots: 'classSlots',
    keyKnownSpells: 'knownSpells',
    keyPreparedSpells: 'preparedSpells',
    keySavedSpellListNames: 'savedSpellListNames',
    keySavedSpellLists: 'savedSpellLists'
};

var TopMenu = Class.create({

    defaultBookName: 'My Spellbook',

    init: function (globalSettings, spellData) {
        this.globalSettings = globalSettings;
        this.spellData = spellData;
        this.bookData = {};
        this.bookMenu = {};
        this.bookIDs = globalSettings.get(BookKeys.keyBookIDs, []);
        $.each(this.bookIDs, $.proxy(function (index, bookID) {
            this.bookData[bookID] = new Storage(bookID);
        }, this));
        // Create new elements in sub-menus
        $.each(this.spellData.sources, function (index, source) {
            var sourceLine = $(`<label><input type="checkbox" id="source_${source.toId()}" name="${source}" class="sourcebook"> ${source}</label>`)
            $('#sourceItems').append(sourceLine);
        });
        this.addOptionsToSelect(this.spellData.classHeadings, 'class', function (heading) {
            return spellData.classNames[heading];
        });
        this.addOptionsToSelect(this.spellData.domains, 'domain', function (domain) {
            return (spellData.subdomains[domain]) ? domain + ' (subdomain)' : domain;
        });
        this.addOptionsToSelect(this.spellData.bloodlines, 'bloodline');
        this.addOptionsToSelect(this.spellData.patrons, 'patron');
        var schoolOptions = [ '', 'favoured', 'opposed' ];
        $.each(this.spellData.schools, function (index, school) {
            var schoolElt = $('<div class="school"/>').attr('id', `school_${school.toId()}`).text(school + ' ');
            $('#schoolItems').append(schoolElt);
            var select = $('<select />').prop('name', school);
            $.each(schoolOptions, function (index, value) {
                select.append($('<option/>', { 'value': value }).text(value));
            });
            schoolElt.append(select);
        });
        $('#spellPopup').dialog({
            'width': 'auto',
            'autoOpen': false,
            'closeOnEscape': false,
            'modal': true
        });
        $('body').on('tap', '.ui-widget-overlay', function (evt) {
            $('#spellPopup').dialog('close');
            evt.preventDefault()
            evt.stopPropagation();
        });
        $(document).on('keydown', $.proxy(function (evt) {
            if (evt.keyCode == 27 && this.selectedBook) {
                evt.preventDefault();
                this.selectedBook.back();
            }
        }, this));
        $(window).on('hashchange', $.proxy(function () {
            if (this.selectedBook) {
                this.selectedBook.openPanel(window.location.hash.substr(1));
            }
        }, this));
        this.setSelectedBook(this.globalSettings.get(BookKeys.keyCurrentBookID));
    },

    addNewBookButton: function () {
        var button = $('<div/>').addClass('book newbook');
        button.append($('<img src="newBook.png" />'));
        button.append($('<div />').text('New spellbook'));
        button.on('tap', $.proxy(this.newSpellbookClicked, this));
        $('#spellbooks').append(button);
        this.newBookButton = button;
    },

    newSpellbookClicked: function (evt) {
        var id = this.getNewBookID();
        var storage = new Storage(id);
        this.bookData[id] = storage;
        this.bookIDs.push(id);
        this.globalSettings.set(BookKeys.keyBookIDs, this.bookIDs);
        storage.set(BookKeys.keyBookName, this.defaultBookName);
        this.addBookButton(id, storage);
    },

    getNewBookID: function () {
        var id;
        do {
            id = 'book' + Math.random().toFixed(8).substr(2);
        } while (this.bookData[id]);
        return id;
    },

    addBookButton: function (id, storage) {
        var text = storage.get(BookKeys.keyBookName);
        var button = $('<div class="book" />');
        button.attr('id', id);
        button.append($('<img src="book.png" />'));
        button.append($(`<div class="name_${id}"></div>`).text(text));
        button.on('tap', $.proxy(this.spellbookClicked, this));
        this.newBookButton.before(button);
    },

    spellbookClicked: function (evt) {
        var target = evt.currentTarget;
        var id = $(target).attr('id');
        this.setSelectedBook(id);
    },

    setSelectedBook: function (bookID) {
        if (bookID) {
            this.globalSettings.set(BookKeys.keyCurrentBookID, bookID);
            if (!this.bookMenu[bookID]) {
                this.bookMenu[bookID] = new BookMenu(bookID, this.bookData[bookID], this.spellData, this.globalSettings, this);
            }
            this.selectedBook = this.bookMenu[bookID];
            this.selectedBook.showBookMenu();
        } else {
            this.globalSettings.clear(BookKeys.keyCurrentBookID);
            this.globalSettings.clear(BookKeys.keyPanelHistory);
            this.selectedBook = null;
            $('.panel').fadeOut();
            this.refresh();
        }
    },

    refresh: function () {
        $('#spellbooks.ui-sortable').sortable('destroy');
        var topdiv = $('#spellbooks');
        topdiv.off();
        topdiv.html('');
        this.addNewBookButton();
        $.each(this.bookIDs, $.proxy(function (index, id) {
            var storage = this.bookData[id];
            this.addBookButton(id, storage);
        }, this));
        topdiv.sortable({
            items: '.book:not(.newbook)',
            stop: $.proxy(function (evt, ui) {
                var ids = $('.book:not(.newbook)').map(function () { return $(this).attr('id') } ).get();
                this.bookIDs = ids;
                this.globalSettings.set(BookKeys.keyBookIDs, ids);
            }, this)
        });
        topdiv.disableSelection();
        topdiv.fadeIn();
    },

    deleteBook: function (id) {
        var index = this.bookIDs.findIndex(id);
        if (index >= 0) {
            this.bookData[id].clearAll();
            delete(this.bookData[id]);
            this.bookIDs.splice(index, 1);
            this.globalSettings.set(BookKeys.keyBookIDs, this.bookIDs);
        }
    },

    addOptionsToSelect: function (valueList, prefix, displayFn) {
        $.each(valueList, function (index, value) {
            var displayName = (displayFn) ? displayFn(value) : value;
            var line = $(`<label class="${prefix}Label"><input type="checkbox" id="${prefix}_${value.toId()}" name="${value}" class="${prefix}"> ${displayName}</label>`)
            $(`#${prefix}Items`).append(line);
        });
    }

});

var BookMenu = Class.create({
    init: function (id, storage, spellData, globalSettings, topMenu) {
        this.id = id;
        this.storage = storage;
        this.spellData = spellData;
        this.globalSettings = globalSettings;
        this.topMenu = topMenu;
    },

    showBookMenu: function () {
        // Load data
        this.selectedSources = this.storage.get(BookKeys.keySelectedSources, []);
        this.selectedClasses = this.storage.get(BookKeys.keySelectedClasses, []);
        this.selectedDomains = this.storage.get(BookKeys.keySelectedDomains, []);
        this.selectedBloodlines = this.storage.get(BookKeys.keySelectedBloodlines, []);
        this.selectedPatrons = this.storage.get(BookKeys.keySelectedPatrons, []);
        this.selectedSchools = this.storage.get(BookKeys.keySelectedSchools, {});
        this.categoryAssociations = this.storage.get(BookKeys.keyCategoryAssociations, {});
        this.classSlots = this.storage.get(BookKeys.keyClassSlots, {});
        this.knownSpells = this.storage.get(BookKeys.keyKnownSpells, {});
        this.preparedSpells = this.storage.get(BookKeys.keyPreparedSpells, {});
        this.savedSpellLists = this.storage.get(BookKeys.keySavedSpellLists, {});
        // TODO removeme convert various saved lists to use IDs
        $.each(this.knownSpells, function (category, spellCategory) {
            $.each(spellCategory, function (level, spellList) {
                spellCategory[level] = spellList.map(function (s) { return s.toId() });
            });
        });
        $.each(this.preparedSpells, function (category, spellCategory) {
            $.each(spellCategory, function (level, spellList) {
                spellCategory[level] = spellList.map(function (s) { return s.toId() });
            });
        });
        $.each(this.savedSpellLists, function (listName, savedList) {
            $.each(savedList, function (category, spellCategory) {
                $.each(spellCategory, function (level, spellList) {
                    spellCategory[level] = spellList.map(function (s) { return s.toId() });
                });
            });
        })
        // TODO end removeme
        this.savedSpellListNames = this.storage.get(BookKeys.keySavedSpellListNames, Object.keys(this.savedSpellLists));
        // Set up elements
        $('#bookPanelTitle').removeClass();
        $('#bookPanelTitle').addClass(`name_${this.id}`).text(this.storage.get(BookKeys.keyBookName));
        $('.back').on('tap', $.proxy(this.back, this));
        var openPanel = $.proxy(this.openPanel, this);
        $('#detailsButton').on('tap', function () { openPanel('detailsPanel'); });
        $('#spellSlotsButton').on('tap', function () { openPanel('spellSlotsPanel'); });
        $('#knownButton').on('tap', function () { openPanel('spellsKnownPanel'); });
        $('#adventuringButton').on('tap', function () { openPanel('adventuringPanel'); });
        // Details panel setup
        $('#detailsAccordion').accordion({
            collapsible: true,
            active: false,
            heightStyle: "content"
        });
        $('#detailsPanel .clear').on('click touch', $.proxy(this.clearAllCheckboxes, this));
        $('#detailsPanel .clearOptions').on('click touch', $.proxy(this.clearAllOptions, this));
        $('#detailsPanel .select').on('click touch', $.proxy(this.setAllCheckboxes, this));
        $('.sourcebook').on('change', $.proxy(function (evt) {
            var checkbox = $(evt.target);
            this.refreshSelectedSources(checkbox.attr('name'), checkbox.prop('checked'));
        }, this));
        $('.class').on('change', $.proxy(function (evt) {
            var checkbox = $(evt.target);
            this.refreshSelectedClasses(checkbox.attr('name'), checkbox.prop('checked'));
        }, this));
        $('.domain').on('change', $.proxy(function (evt) {
            var checkbox = $(evt.target);
            this.changeSelection(this.copy.selectedDomains, checkbox.attr('name'), checkbox.prop('checked'), $.proxy(this.domainCompare, this));
            this.refreshSelectedDomains();
        }, this));
        $('.bloodline').on('change', $.proxy(function (evt) {
            var checkbox = $(evt.target);
            this.changeSelection(this.copy.selectedBloodlines, checkbox.attr('name'), checkbox.prop('checked'));
            this.refreshSelection('Bloodline: ', $('#bloodlineChoice'), this.copy.selectedBloodlines);
        }, this));
        $('.patron').on('change', $.proxy(function (evt) {
            var checkbox = $(evt.target);
            this.changeSelection(this.copy.selectedPatrons, checkbox.attr('name'), checkbox.prop('checked'));
            this.refreshSelection('Patron: ', $('#patronChoice'), this.copy.selectedPatrons);
        }, this));
        $('.school').on('change', $.proxy(function (evt) {
            var select = $(evt.target);
            if (select.val()) {
                this.copy.selectedSchools[select.prop('name')] = select.val();
            } else {
                delete(this.copy.selectedSchools[select.prop('name')]);
            }
            this.refreshSelection('School: ', $('#schoolChoice'), this.copy.selectedSchools);
        }, this));
        $('#detailsPanelApply').on('tap', $.proxy(this.onDetailsPanelApply, this));
        $('#detailsPanelDelete').on('tap', $.proxy(this.onDetailsPanelDelete, this));
        $('#spellSlotsPanelApply').on('tap', $.proxy(this.onSpellSlotsPanelApply, this));
        $('#spellsKnownPanelApply').on('tap', $.proxy(this.onSpellsKnownPanelApply, this));
        $('#adventuringRestButton').on('tap', $.proxy(this.onAdventuringRestButton, this));
        $('#adventuringChangeSpellsButton').on('tap', function () { openPanel('prepareSpellsPanel'); });
        $('#prepareSpellsApplyButton').on('tap', $.proxy(this.onPrepareSpellsApplyButton, this));
        $('#prepareSpellsStoreButton').on('tap', function () { openPanel('spellStorePanel'); });
        $('#spellStoreSaveButton').on('tap', $.proxy(this.onSpellStoreSaveButton, this));
        $('#spellStoreLoadButton').on('tap', $.proxy(this.onSpellStoreLoadButton, this));
        $('#spellStoreDeleteButton').on('tap', $.proxy(this.onSpellStoreDeleteButton, this));
        // Load saved panel history
        this.panelHistory = [];
        var views = this.globalSettings.get(BookKeys.keyPanelHistory, [ 'menu' ]);
        for (var index = 0; index < views.length; ++index) {
            this.openPanel(views[index]);
        }
    },

    openPanel: function (view) {
        if (this.panelHistory.length == 0 || view != this.panelHistory[this.panelHistory.length - 1]) {
            var backwards = this.panelHistory.indexOf(view);
            if (backwards >= 0) {
                this.panelHistory.splice(backwards + 1);
            } else {
                this.panelHistory.push(view);
            }
            this.globalSettings.set(BookKeys.keyPanelHistory, this.panelHistory);
            window.location.hash = view;
            if (view.startsWith('spell:')) {
                var spellId = view.substr('spell:'.length);
                var spell = this.spellData.spellById[spellId];
                this.displaySpellDetails(spell);
            } else if ($('#spellPopup').dialog('isOpen')) {
                $('#spellPopup').dialog('close');
            } else {
                $('.panel').fadeOut();
                if (view == '') {
                    $('.ui-accordion').accordion('destroy');
                    $('#book *').off();
                    this.topMenu.setSelectedBook(null);
                } else if (view == 'menu') {
                    $('#bookMenu').fadeIn();
                } else if (view == 'detailsPanel') {
                    $('#detailsPanel').fadeIn();
                    this.showDetailsPanel();
                } else if (view == 'spellSlotsPanel') {
                    $('#spellSlotsPanel').fadeIn();
                    this.showSpellSlotsPanel();
                } else if (view == 'spellsKnownPanel') {
                    $('#spellsKnownPanel').fadeIn();
                    this.showKnownPanel();
                } else if (view == 'adventuringPanel') {
                    $('#adventuringPanel').fadeIn();
                    this.showAdventuringPanel();
                } else if (view == 'prepareSpellsPanel') {
                    $('#prepareSpellsPanel').fadeIn();
                    this.showPrepareSpellsPanel();
                } else if (view == 'spellStorePanel') {
                    $('#spellStorePanel').fadeIn();
                    this.showSpellStorePanel();
                } else {
                    console.error('Unknown view name: ' + view);
                }
            }
        }
    },

    back: function () {
        if (this.panelHistory.length > 1) {
            this.openPanel(this.panelHistory[this.panelHistory.length - 2]);
        } else {
            this.openPanel('');
        }
    },

    showDetailsPanel: function () {
        $('#spellbookNameInput').val(this.storage.get(BookKeys.keyBookName));
        this.copy = $.extend(true, {}, {
            selectedSources: this.selectedSources,
            selectedClasses: this.selectedClasses,
            selectedBloodlines: this.selectedBloodlines,
            selectedPatrons: this.selectedPatrons,
            selectedSchools: this.selectedSchools
        });
        if (this.selectedDomains.length > 0) {
            this.copy.selectedDomains = this.selectedDomains.toString().split(/,/).sort($.proxy(this.domainCompare, this));
        } else {
            this.copy.selectedDomains = [];
        }
        this.resetCheckboxes('sourcebook', this.copy.selectedSources, 'source');
        this.resetCheckboxes('class', this.copy.selectedClasses, 'class');
        this.resetCheckboxes('domain', this.copy.selectedDomains, 'domain');
        this.resetCheckboxes('bloodline', this.copy.selectedBloodlines, 'bloodline');
        this.resetCheckboxes('patron', this.copy.selectedPatrons, 'patron');
        $.each(this.spellData.schools, $.proxy(function (index, school) {
            $('select[name="' + school + '"]').val(this.copy.selectedSchools[school]);
        }, this));
        this.refreshSelectedSources();
        this.refreshSelectedClasses();
        this.refreshSelection('Bloodline: ', $('#bloodlineChoice'), this.copy.selectedBloodlines);
        this.refreshSelectedDomains();
        this.refreshSelection('Patron: ', $('#patronChoice'), this.copy.selectedPatrons);
        this.refreshSelection('School: ', $('#schoolChoice'), this.copy.selectedSchools);
    },

    resetCheckboxes: function (checkboxClass, list, prefix) {
        $('.' + checkboxClass).prop('checked', false);
        $.each(list, function (index, value) {
            $(`#${prefix}_${value.toId()}`).prop('checked', true);
        });
    },

    refreshSelectedSources: function (source, enabled) {
        this.changeSelection(this.copy.selectedSources, source, enabled, $.proxy(this.spellData.sourceSort, this.spellData));
        if (this.copy.selectedSources.length > 0) {
            $('#sourceNames').text('Source books: ' + this.copy.selectedSources.join(', '));
        } else {
            $('#sourceNames').text('Source books: none selected');
        }
        // Only show options that exist in the given sources, or that are already on
        this.showOptionsForSourceSelection(this.spellData.classesForSources, 'class', this.copy.selectedClasses);
        this.showOptionsForSourceSelection(this.spellData.bloodlinesForSources, 'bloodline', this.copy.selectedBloodlines);
        this.showOptionsForSourceSelection(this.spellData.domainsForSources, 'domain', this.copy.selectedDomains);
        this.showOptionsForSourceSelection(this.spellData.patronsForSources, 'patron', this.copy.selectedPatrons);
    },

    showOptionsForSourceSelection: function (sourceMap, prefix, current) {
        var values = this.spellData.valuesFromSourceMap(sourceMap, this.copy.selectedSources);
        $(`.${prefix}Label`).hide();
        $.each(values.concat(current), function (index, value) {
            $(`#${prefix}_${value.toId()}`).parent().show();
        });
    },

    refreshSelectedClasses: function (classHeading, enabled) {
        this.changeSelection(this.copy.selectedClasses, classHeading, enabled, undefined);
        var selectedClassNames = this.copy.selectedClasses.map($.proxy(function (key) {
            return this.spellData.classNames[key];
        }, this));
        this.refreshSelection('Character classes: ', $('#classNames'), selectedClassNames);
    },

    changeSelection: function (list, value, enabled, sortFn) {
        if (value) {
            var index = $.inArray(value, list);
            if (enabled && index < 0) {
                list.push(value);
                list.sort(sortFn);
            } else if (!enabled && index >= 0) {
                list.splice(index, 1);
            }
        }
    },

    refreshSelection: function (label, element, values) {
        if ($.isArray(values)) {
            if (values.length > 0) {
                element.text(label + values.join(', '));
            } else {
                element.text(label + 'none selected');
            }
        } else if (Object.keys(values).length == 0) {
            element.text(label + 'none selected');
        } else {
            var reverse = {};
            $.each(values, function (key, value) {
                if (!reverse[value]) {
                    reverse[value] = [];
                }
                reverse[value].push(key);
            });
            var text = '';
            $.each(Object.keys(reverse).sort(), function (index, key) {
                if (text) {
                    text += ', ';
                }
                text += key + ': ';
                text += reverse[key].sort().join(', ');
            });
            element.text(label + text);
        }
    },

    domainCompare: function (d1, d2) {
        var v1 = (this.spellData.subdomains[d1]) ? 1 : 0;
        var v2 = (this.spellData.subdomains[d2]) ? 1 : 0;
        return v2 - v1;
    },

    bunchDomains: function (flatList) {
        var result = [];
        var domainStart = flatList.findIndex($.proxy(function (domain) {
            return !this.spellData.subdomains[domain];
        }, this));
        if (domainStart < 0) {
            domainStart = flatList.length;
        }
        var domainIndex = domainStart;
        for (var index = 0; index < domainStart; ++index) {
            var subdomain = flatList[index];
            var domain = (domainIndex < flatList.length) ? flatList[domainIndex++] : null;
            result.push([domain, subdomain]);
        }
        for (var index = domainIndex; index < flatList.length; ++index) {
            result.push(flatList[index]);
        }
        return result;
    },

    domainsToString: function (bunched) {
        var string = '';
        for (var index = 0; index < bunched.length; ++index) {
            var domain = bunched[index];
            if (string) {
                string += ', ';
            }
            if ($.isArray(domain)) {
                string += domain[1];
                string += ' (subdomain of ';
                string += domain[0] || '?';
                string += ')';
            } else {
                string += domain;
            }
        }
        return string;
    },

    refreshSelectedDomains: function () {
        if (this.copy.selectedDomains.length > 0) {
            var bunched = this.bunchDomains(this.copy.selectedDomains);
            $('#domainChoice').text('Domains: ' + this.domainsToString(bunched));
        } else {
            $('#domainChoice').text('Domains: none selected');
        }
    },

    onDetailsPanelApply: function (evt) {
        var newName = $('#spellbookNameInput').val();
        this.storage.set(BookKeys.keyBookName, newName);
        $(`.name_${this.id}`).text(newName);
        this.selectedSources = this.copy.selectedSources;
        this.selectedClasses = this.copy.selectedClasses;
        this.selectedBloodlines = this.copy.selectedBloodlines;
        this.selectedDomains = this.bunchDomains(this.copy.selectedDomains);
        this.selectedPatrons = this.copy.selectedPatrons;
        this.selectedSchools = this.copy.selectedSchools;
        this.copy = null;
        this.storage.set(BookKeys.keySelectedSources, this.selectedSources);
        this.storage.set(BookKeys.keySelectedClasses, this.selectedClasses);
        this.storage.set(BookKeys.keySelectedBloodlines, this.selectedBloodlines);
        this.storage.set(BookKeys.keySelectedDomains, this.selectedDomains);
        this.storage.set(BookKeys.keySelectedPatrons, this.selectedPatrons);
        this.storage.set(BookKeys.keySelectedSchools, this.selectedSchools);
        this.back();
    },

    onDetailsPanelDelete: function (evt) {
        var name = this.storage.get(BookKeys.keyBookName);
        if (window.confirm('Do you really want to delete "' + name + '"?  All saved configuration will be lost.')) {
            this.topMenu.deleteBook(this.id);
            this.openPanel('menu');
            this.back();
        }
    },

    showLoading: function (element, endFn) {
        element.html('');
        var spinner = $('<img class="spinner" src="loading.gif" />');
        element.after(spinner);
        window.setTimeout(function () {
            endFn();
            $('.spinner').remove();
        }, 500);
    },

    showSpellSlotsPanel: function () {
        this.showLoading($('#spellSlotsItems'), $.proxy(this.populateSpellSlotsPanel, this));
    },

    textPreparedSlots: 'Prepared spell slots',
    textSpontaneousSlots: 'Spontaneous spell slots',

    populateSpellSlotsPanel: function () {
        this.appendClassSlots();
        if (this.selectedClasses.length > 1) {
            this.appendClassAssociation('Bloodline', this.selectedBloodlines);
            this.appendClassAssociation('Domain', this.selectedDomains);
            this.appendClassAssociation('Patron', this.selectedPatrons);
            this.appendClassAssociation('School', this.selectedSchools);
        }
    },

    appendClassAssociation: function (heading, list) {
        var assocation = this.categoryAssociations[heading] || {};
        $.each(list, $.proxy(function (index, category) {
            var text = heading + ' ';
            if ($.isArray(category)) {
                category = category[1];
            } else if (isNaN(index)) {
                text = category.toTitleCase() + ' ' + text;
                category = index;
            }
            var div = $('<div/>').addClass('spellSlotsHeading');
            div.append($('<b/>').text(text + category + ' associated with '));
            var select = $('<select/>').prop('name', heading + '_' + category.toId());
            $.each(this.selectedClasses, $.proxy(function (index, classHeading) {
                var className = this.spellData.classNames[classHeading];
                select.append($('<option/>', {value: classHeading}).text(className));
            }, this));
            div.append(select);
            select.val(assocation[category] || this.selectedClasses[0]);
            $('#spellSlotsItems').append(div);
        }, this));
    },

    defaultSlotForClass: function (classHeading) {
        // I don't believe this can be made data-driven from the stuff available from pathfindercommunity.net :(
        if (classHeading == 'bard' || classHeading == 'bloodrager' || classHeading == 'inquisitor' ||
                classHeading == 'oracle' || classHeading == 'skald' || classHeading == 'sor' ||
                classHeading == 'summoner') {
            return this.textSpontaneousSlots;
        } else {
            return this.textPreparedSlots;
        }
    },

    appendClassSlots: function (previousValues, defaultValue) {
        $.each(this.selectedClasses, $.proxy(function (index, value) {
            var maxLevel = 9; // TODO
            this.appendSpellSlots('', value, maxLevel, this.classSlots, this.defaultSlotForClass(value));
        }, this));
    },

    appendSpellSlots: function (prefix, value, maxLevel, previousValues, defaultValue) {
        value = prefix + value;
        var name = (prefix) ? value : this.spellData.classNames[value];
        var slotData = previousValues[value] || { 'slots': [] };
        var topDiv = $('<div/>').addClass('spellSlots');
        var title = $('<div/>').addClass('spellSlotsHeading');
        title.append($('<b/>').text(name + ' spells per day'));
        var control = $(`<select id="${value.toId()}_slotType" />`);
        control.append($('<option/>').text(this.textPreparedSlots));
        control.append($('<option/>').text(this.textSpontaneousSlots));
        title.append(control);
        var slotDivId = value.toId() + '_slots';
        control.val(slotData.slotType || defaultValue);
        topDiv.append(title);
        var slotsDiv = $('<div />').addClass('allSlots').attr('id', slotDivId);
        for (var level = 0; level <= maxLevel; ++level) {
            var slot = $('<div/>').addClass('spellsPerDaySlot');
            slot.append($('<div/>').text(level.ordinal() + ' level'));
            var inputElement = $(`<input type="number" step="1" class="spellPerDay_${value.toId()}" />`);
            slot.append($('<div/>').append(inputElement));
            inputElement.val(slotData.slots[level] || 0);
            slotsDiv.append(slot);
        }
        topDiv.append(slotsDiv);
        $('#spellSlotsItems').append(topDiv);
        control.trigger('change');
    },

    onSpellSlotsPanelApply: function () {
        this.classSlots = this.buildSpellSlots();
        this.storage.set(BookKeys.keyClassSlots, this.classSlots);
        this.categoryAssociations = {};
        this.saveAssocations('Bloodline', this.selectedBloodlines);
        this.saveAssocations('Domain', this.selectedDomains);
        this.saveAssocations('Patron', this.selectedPatrons);
        this.saveAssocations('School', this.selectedSchools);
        this.storage.set(BookKeys.keyCategoryAssociations, this.categoryAssociations);
        this.back();
    },

    buildSpellSlots: function (list) {
        var result = {};
        $.each(this.selectedClasses, $.proxy(function (index, value) {
            var maxLevel = 9; // TODO
            var slotType = $(`#${value.toId()}_slotType`).val();
            var slots = [];
            $(`.spellPerDay_${value.toId()}`).each(function (index, input) {
                slots.push(parseInt($(input).val()));
            });
            result[value] = { 'slotType': slotType, 'slots': slots };
        }, this));
        return result;
    },

    saveAssocations: function (heading, list) {
        $.each(list, $.proxy(function (index, category) {
            if (!this.categoryAssociations[heading]) {
                this.categoryAssociations[heading] = {};
            }
            if ($.isArray(category)) {
                category = category[1];
            } else if (isNaN(index)) {
                category = index;
            }
            var value;
            if (this.selectedClasses.length == 1) {
                value = this.selectedClasses[0];
            } else {
                value = $(`select[name="${heading}_${category.toId()}"]`).val();
            }
            this.categoryAssociations[heading][category] = value;
        }, this));
    },

    showKnownPanel: function () {
        $('#spellsKnownPanel .ui-accordion').accordion('destroy');
        this.showLoading($('#spellListAccordion'), $.proxy(this.populateKnownPanel, this));
    },

    populateKnownPanel: function () {
        this.listSpellCategory(this.selectedClasses, '');
        this.listSpellCategory(this.selectedBloodlines, 'Bloodline: ');
        this.listSpellCategory(this.selectedDomains, 'Domain: ');
        this.listSpellCategory(this.selectedPatrons, 'Patron: ');
        $('#spellsKnownPanel .accordion').accordion({
            collapsible: true,
            heightStyle: "content"
        });
    },

    listSpellCategory: function (list, prefix) {
        var accordion = $('#spellListAccordion');
        $.each(list, $.proxy(function (index, value) {
            var name;
            var subdomain = null;
            if ($.isArray(value)) {
                subdomain = [ value[0], value[1], prefix ];
                name = prefix + this.domainsToString([ value ]);
                value = prefix + value[1];
            } else {
                value = prefix + value;
                name = (prefix) ? value : this.spellData.classNames[value];
            }
            if (!this.knownSpells[value]) {
                this.knownSpells[value] = {};
            }
            var headingElt = $('<h3/>').text(name);
            accordion.append(headingElt);
            headingElt.append($('<span class="headingControlLink" />').text('Clear All').on('click touch', $.proxy(this.clearAllCheckboxes, this)));
            headingElt.append($('<span class="headingControlLink" />').text('Select All').on('click touch', $.proxy(this.setAllCheckboxes, this)));
            var categoryDiv = $('<div/>').addClass('accordion').addClass(value.toId());
            this.spellData.rawData.sort(this.orderSpellsByFields(subdomain || value, 'name'));
            var currentLevel, currentDiv, skipDomainSpell = false;
            for (var index = 0; index < this.spellData.rawData.length; ++index) {
                var spell = this.spellData.rawData[index];
                if (this.selectedSources.indexOf(spell.source) >= 0) {
                    var spellLevel = spell[value];
                    if (subdomain) {
                        if (skipDomainSpell) {
                            spellLevel = undefined;
                            skipDomainSpell = false;
                        } else if (spellLevel === undefined) {
                            spellLevel = spell[prefix + subdomain[0]];
                        } else {
                            // Subdomain spells are sorted just before the domain spell they override.
                            skipDomainSpell = true;
                        }
                    }
                    if (spellLevel !== undefined) {
                        if (spellLevel != currentLevel) {
                            currentLevel = spellLevel;
                            var levelElt = $('<h4 />').text('Level ' + currentLevel);
                            levelElt.append($('<span class="headingControlLink" />').text('Clear All').on('click touch', $.proxy(this.clearAllCheckboxes, this)));
                            levelElt.append($('<span class="headingControlLink" />').text('Select All').on('click touch', $.proxy(this.setAllCheckboxes, this)));
                            categoryDiv.append(levelElt);
                            currentDiv = $('<div />');
                            categoryDiv.append(currentDiv);
                        }
                        this.appendSpellLine(currentDiv, spell, (this.knownSpells[value][currentLevel] !== undefined &&
                                this.knownSpells[value][currentLevel].indexOf(spell.name.toId()) >= 0));
                    }
                }
            }
            accordion.append(categoryDiv);
        }, this));
    },

    appendSpellLine: function (element, spell, known, overLevel) {
        var line = $('<label class="spell" />');
        line.addClass(spell.school);
        line.append($('<span />').addClass('title').text(spell.name));
        if (known !== undefined) {
            var spellKey = spell.name.toId();
            line.append($(`<input type="checkbox" name="${spellKey}" />`).prop('checked', known));
        }
        if (overLevel == 1) {
            line.append($('<span class="note" />').text('(1 level over)'));
        } else if (overLevel > 0) {
            line.append($('<span class="note" />').text('(' + overLevel + ' levels over)'));
        }
        line.append($('<div/>').addClass('view').append($('<img src="eye.svg"/>')).on('tap', $.proxy(function (evt) {
            this.displaySpellDetails(spell);
            evt.stopPropagation();
        }, this)));
        element.append(line);
        return line;
    },

    setAllCheckboxes: function (evt) {
        // Find ancestor H3/H4 element, then set all checkboxes in the following sibling.
        var element = $(evt.target).closest('h3,h4').next();
        element.find('input').prop('checked', true).change();
        evt.stopPropagation();
    },

    clearAllCheckboxes: function (evt) {
        // Find ancestor H3/H4 element, then clear all checkboxes in the following sibling.
        var element = $(evt.target).closest('h3,h4').next();
        element.find('input').prop('checked', false).change();
        evt.stopPropagation();
    },

    clearAllOptions: function (evt) {
        // Find ancestor H3/H4 element, then clear all select elements in the following sibling.
        var element = $(evt.target).closest('h3,h4').next();
        element.find('select').val('').change();
        evt.stopPropagation();
    },

    orderSpellsByFields: function () {
        var fields = arguments;
        return function (o1, o2) {
            for (var index = 0; index < fields.length; ++index) {
                var field = fields[index];
                var v1, v2;
                if ($.isArray(field)) {
                    v1 = o1[field[2] + field[0]] || ((o1[field[2] + field[1]] !== undefined) ? o1[field[2] + field[1]] - 0.1 : undefined );
                    v2 = o2[field[2] + field[0]] || ((o2[field[2] + field[1]] !== undefined) ? o2[field[2] + field[1]] - 0.1 : undefined );
                } else {
                    v1 = o1[field];
                    v2 = o2[field];
                }
                if (v1 !== undefined || v2 !== undefined) {
                    if (v2 === undefined || v1 < v2) {
                        return -1;
                    } else if (v1 === undefined || v1 > v2) {
                        return 1;
                    }
                }
            }
            return 0;
        };
    },

    displaySpellDetails: function (spell) {
        var content = spell.full_text;
        if (this.selectedSources.indexOf('Mythic Adventures') < 0) {
            var mythicMatch = /<h[1-5]><b>Mythic:/.exec(content);
            if (mythicMatch) {
                content = content.substr(0, mythicMatch.index);
            }
        }
        content = content.replace(/<i>([^<,.]*)([,.])?<\/i>/g, $.proxy(function (whole, spellName, after) {
            var spellKey = spellName.toId();
            if (this.spellData.spellById[spellKey]) {
                after = after || '';
                return `<i><a href="#spell:${spellKey}">${spellName}</a>${after}</i>`;
            } else {
                return whole;
            }
        }, this));
        content = content.replace(/<(\/)?h[1-5]>/g, '<$1div>');
        var hasHeadings = false;
        content = content.replace(/<div><b>([A-Z]*)<\/b><\/div>/g, function (whole, subheading) {
            hasHeadings = true;
            return '<div class="subheading">' + subheading.toTitleCase() + '</div>';
        });
        if (!hasHeadings) {
            content = content.replace(/(<div><b>Casting Time)/, '<div class="subheading">Casting</div>$1');
            content = content.replace(/(<div><b>Range)/, '<div class="subheading">Effect</div>$1');
            content = content.replace(/(<div><p>)/, '<div class="subheading">Description</div>$1');
        }
        $('#spellPopup').html(content).dialog('option', 'title', spell.name)
                .dialog('option', 'position', { my: 'left top', at: 'left top', of: window })
                .dialog('open');
        window.location.hash = 'spell:' + spell.name.toId();
    },

    onSpellsKnownPanelApply: function () {
        this.knownSpells = {};
        this.buildSpellsKnown(this.selectedClasses, '');
        this.buildSpellsKnown(this.selectedBloodlines, 'Bloodline: ');
        this.buildSpellsKnown(this.selectedDomains, 'Domain: ');
        this.setDomainAll();
        this.buildSpellsKnown(this.selectedPatrons, 'Patron: ');
        this.storage.set(BookKeys.keyKnownSpells, this.knownSpells);
        this.back();
    },

    buildSpellsKnown: function (list, prefix) {
        $.each(list, $.proxy(function (index, value) {
            var category;
            if ($.isArray(value)) {
                category = prefix + value[1];
            } else {
                category = prefix + value;
            }
            var known = {};
            $(`.${category.toId()} :checked`).each($.proxy(function (index, input) {
                var spellKey = $(input).attr('name');
                var spell = this.spellData.spellById[spellKey];
                var level = spell[category];
                if (level === undefined && $.isArray(value)) {
                    level = spell[prefix + value[0]];
                }
                if (!known[level]) {
                    known[level] = [];
                }
                known[level].push(spellKey);
            }, this));
            this.knownSpells[category] = known;
        }, this));
    },

    setDomainAll: function () {
        $.each(this.selectedDomains, $.proxy(function (index, domain) {
            var all = [], category;
            if ($.isArray(domain)) {
                category = 'Domain: ' + domain[1];
            } else {
                category = 'Domain: ' + value;
            }
            $.each(this.knownSpells[category], function (level, spellList) {
                all = all.concat(spellList);
            });
            this.knownSpells[category]['all'] = all;
        }, this));
    },

    showAdventuringPanel: function () {
        $('#adventuringSpells').off('.adventureControl');
        $('#adventuringRestButton').hide();
        $('#adventuringChangeSpellsButton').hide();
        this.showLoading($('#adventuringSpells'), $.proxy(this.populateAdventuringPanel, this));
    },

    populateAdventuringPanel: function () {
        this.addAdventuringCategory(this.selectedClasses, '', this.classSlots);
    },

    addAdventuringCategory: function (list, prefix, categorySlotData) {
        var topDiv = $('#adventuringSpells');
        $.each(list, $.proxy(function (index, value) {
            value = prefix + value;
            var name = (prefix) ? value : this.spellData.classNames[value];
            var slotData = categorySlotData[value] || { 'slots': [] };
            if (!slotData.slotsToday) {
                slotData.slotsToday = [];
            }
            topDiv.append($('<h4/>').text(name));
            var spellsToday;
            if (slotData.slotType == this.textPreparedSlots) {
                spellsToday = this.preparedSpells[value] || {};
                $('#adventuringChangeSpellsButton').show();
            } else {
                spellsToday = this.getKnownSpellsForClass(value);
            }
            if (Object.keys(spellsToday).length > 0) {
                $('#adventuringRestButton').show();
            }
            $.each(spellsToday, $.proxy(function (level, spellKeyList) {
                if (slotData.slots[level] == 0 && spellKeyList.length == 0) {
                    return;
                }
                topDiv.append($('<h4 />').text('Level ' + level));
                var currentDiv = $('<div />').data('psb_category', value);
                var clickFn;
                if (slotData.slotType == this.textSpontaneousSlots) {
                    var slotDiv = $('<div class="slotDiv" />');
                    if (slotData.slots[level] > 0) {
                        this.createCheckboxControl(slotDiv, slotData.slots[level], slotData.slotsToday, level, value);
                    } else {
                        slotDiv.text('At will');
                    }
                    topDiv.append(slotDiv);
                    clickFn = $.proxy(function (evt) {
                        this.checkboxInteraction(slotDiv, (evt.type == 'tap') ? -1 : 1);
                    }, this);
                    if (slotData.slots[level] > 0 && slotData.slotsToday[level] == 0) {
                        currentDiv.fadeTo(0, 0.3);
                    }
                } else {
                    clickFn = $.proxy(this.castPreparedSpell, this);
                }
                topDiv.append(currentDiv);
                $.each(spellKeyList.sort(), $.proxy(function (index, spellKey) {
                    var isUsed = false;
                    if (spellKey.indexOf('!') == spellKey.length - 1) {
                        isUsed = true;
                        spellKey = spellKey.substr(0, spellKey.length - 1);
                    }
                    var spell = this.spellData.spellById[spellKey];
                    var spellLevel = this.getSpellLevel(value, spell);
                    var element = this.appendSpellLine(currentDiv, spell, undefined, level - spellLevel);
                    element.data('psb_level', level);
                    element.on('tap.adventureControl press.adventureControl', clickFn);
                    if (isUsed) {
                        element.addClass('used');
                    }
                }, this));
                if (slotData.slotType == this.textPreparedSlots) {
                    var slotUsage = this.calculatePreparedSlotsLeft(value, level);
                    if (slotUsage[0] != 0) {
                        var text = this.getPreparedSlotsLeftText(slotUsage).replace('remaining', 'unused');
                        currentDiv.append($('<div/>').text(text));
                    }
                }
            }, this));
        }, this));
    },

    getSpellLevel: function (classHeading, spell) {
        var level = spell[classHeading];
        for (var index = 0; level === undefined && index < this.selectedDomains.length; ++index) {
            var domain = this.selectedDomains[index];
            if ($.isArray(domain)) {
                level = spell['Domain: ' + domain[1]] || spell['Domain: ' + domain[0]];
            } else {
                level = spell['Domain: ' + domain];
            }
        }
        return level;
    },

    createCheckboxControl: function (element, spellsPerDay, slotsToday, slotKey, heading) {
        element.addClass('checkboxControl');
        element.data('psb_spellsPerDay', spellsPerDay);
        element.data('psb_slotsToday', slotsToday);
        element.data('psb_slotKey', slotKey);
        this.refreshCheckboxesNOfM(element, spellsPerDay, slotsToday[slotKey] || 0);
        element.on('tap.adventureControl', $.proxy(this.checkboxTouchHandler, this));
        element.on('press.adventureControl', $.proxy(this.checkboxTouchHandler, this));
    },

    checkboxTouchHandler: function (evt) {
        var delta = (!evt) ? 0 : (evt.type === 'tap') ? -1 : 1;
        this.checkboxInteraction($(evt.currentTarget), delta);
    },

    checkboxInteraction: function (element, delta) {
        if (element.presence()) {
            var spellsPerDay = element.data('psb_spellsPerDay');
            var slotsToday = element.data('psb_slotsToday');
            var slotKey = element.data('psb_slotKey');
            var category = element.next().data('psb_category');
            if (slotsToday[slotKey] + delta <= spellsPerDay && slotsToday[slotKey] + delta >= 0) {
                slotsToday[slotKey] += delta;
                this.refreshCheckboxesNOfM(element, spellsPerDay, slotsToday[slotKey]);
                this.storage.set(BookKeys.keyClassSlots, this.classSlots);
                if (slotsToday[slotKey] == 0 && delta == -1) {
                    $('.' + element.attr('id')).fadeTo('fast', 0.3);
                } else if (slotsToday[slotKey] == 1 && delta == 1) {
                    $('.' + element.attr('id')).fadeTo('fast', 1.0);
                }
            }
        }
    },

    refreshCheckboxesNOfM: function (element, max, current) {
        var checkboxeList = element.find('input[type="checkbox"]');
        if (checkboxeList.length > max) {
            element.html('');
        }
        for (box = 0; box < max; ++box) {
            var checkbox;
            if (box < checkboxeList.length) {
                checkbox = checkboxeList.eq(box);
            } else {
                checkbox = $('<input type="checkbox" />').on('click touch', function (evt) {
                    evt.preventDefault();
                });
                element.append(checkbox);
            }
            checkbox.prop('checked', (box < max - current));
        }
    },

    castPreparedSpell: function (evt) {
        var spellDiv = $(evt.currentTarget);
        var using = (evt.type == 'tap');
        var spellKey = spellDiv.find('.title').text().toId();
        var from, to;
        if (using) {
            spellDiv.addClass('used');
            from = spellKey;
            to = spellKey + '!';
        } else {
            spellDiv.removeClass('used');
            from = spellKey + '!';
            to = spellKey;
        }
        var level = spellDiv.data('psb_level');
        var category = spellDiv.parent().data('psb_category');
        var prepared = this.preparedSpells[category][level];
        var index = prepared.indexOf(from);
        if (index >= 0) {
            prepared[index] = to;
            this.storage.set(BookKeys.keyPreparedSpells, this.preparedSpells);
        }
    },

    onAdventuringRestButton: function (evt) {
        this.categoryRest(this.selectedClasses, '', this.classSlots);
        $('.checkboxControl').each($.proxy(function (index, element) {
            this.checkboxInteraction($(element), 0);
        }, this));
        $('.spell.used').removeClass('used');
        this.storage.set(BookKeys.keyClassSlots, this.classSlots);
        this.storage.set(BookKeys.keyPreparedSpells, this.preparedSpells);
    },

    categoryRest: function (list, prefix, categorySlotData) {
        if (!list) {
            return;
        }
        $.each(list, $.proxy(function (index, value) {
            value = prefix + value;
            var slotData = categorySlotData[value];
            if (slotData.slotType == this.textSpontaneousSlots) {
                for (var level = 0; level < slotData.slots.length; ++level) {
                    if (slotData.slotsToday[level] == 0) {
                        $(`.slot_${value.toId()}_${level}`).fadeTo('fast', 1.0);
                    }
                    slotData.slotsToday[level] = slotData.slots[level];
                }
            } else if (this.preparedSpells[value]) {
                $.each(this.preparedSpells[value], function (level, spellKeyList) {
                    for (var index = 0; index < spellKeyList.length; ++index) {
                        var spellKey = spellKeyList[index];
                        if (spellKey.indexOf('!') == spellKey.length - 1) {
                            spellKeyList[index] = spellKey.substr(0, spellKey.length - 1);
                        }
                    }
                });
            }
        }, this));
    },

    showPrepareSpellsPanel: function () {
        if (!this.copy || !this.copy.preparedSpells) {
            this.copy = {
                preparedSpells: $.extend(true, {}, this.preparedSpells)
            };
        }
        $('#prepareSpellsPanel').off('.prepareSpells');
        $('#prepareSpellsPanel .ui-accordion').accordion('destroy');
        $('#prepareSpellsPanel .ui-draggable').draggable('destroy');
        $('#prepareSpellsPanel .ui-droppable').droppable('destroy');
        this.showLoading($('#preparedSpells'), $.proxy(this.populatePrepareSpellsPanel, this));
    },

    populatePrepareSpellsPanel: function () {
        $.each(this.selectedClasses, $.proxy(function (index, value) {
            var slotData = this.classSlots[value];
            if (slotData && slotData.slotType == this.textPreparedSlots) {
                var name = this.spellData.classNames[value];
                $('#preparedSpells').addClass('accordion').append($('<h3 />').text(name)
                        .append($('<span class="headingControlLink" />').text('Clear').on('click touch', $.proxy(this.clearPreparedSpells, this))));
                var currentDiv = $('<div class="prepareCategory" />').data('category', value);
                $('#preparedSpells').append(currentDiv);
                var knownDiv = $('<div/>').addClass('accordion').text('Known spells');
                var preparedDiv = $('<div/>').addClass('accordion preparedDiv').text('Prepared spells');
                $(window).on('scroll.prepareSpells', function (evt) {
                    if (!preparedDiv.is(':hidden')) {
                        var max = currentDiv.height() - preparedDiv.innerHeight();
                        var openedLevel = knownDiv.find('.ui-accordion-header-active').data('level') || 0;
                        var preparedHeading = preparedDiv.find('h4').eq(openedLevel);
                        var offset = $(window).scrollTop() - knownDiv.offset().top - preparedHeading.position().top +
                                $('.back').height();
                        if (offset > max) {
                            preparedDiv.css({ 'margin-top': max });
                        } else if (offset > 0) {
                            preparedDiv.css({ 'margin-top': offset });
                        } else {
                            preparedDiv.css({ 'margin-top': 0 });
                        }
                    }
                });
                currentDiv.append(knownDiv);
                currentDiv.append(preparedDiv);
                this.spellData.rawData.sort(this.orderSpellsByFields(value, 'name'));
                if (!this.knownSpells[value]) {
                    this.knownSpells[value] = {};
                }
                if (!this.copy.preparedSpells[value]) {
                    this.copy.preparedSpells[value] = {};
                }
                var maxLevel = 9; // TODO
                var acceptSelector = 'noSuchThing';
                for (var level = 0; level < maxLevel; ++level) {
                    if (!slotData.slots[level]) {
                        continue;
                    }
                    if (!this.knownSpells[value][level]) {
                        this.knownSpells[value][level] = [];
                    }
                    this.appendPreparedKnownSpells(knownDiv, value, level);
                    if (!this.copy.preparedSpells[value][level]) {
                        this.copy.preparedSpells[value][level] = [];
                    }
                    acceptSelector += ',.knownSpells' + level;
                    this.appendPreparedPreparedSpells(preparedDiv, value, level, acceptSelector);
                }
            }
        }, this));
        $('#prepareSpellsPanel .accordion').accordion({
            collapsible: true,
            heightStyle: "content"
        });
    },

    getKnownSpellsForClass: function (classHeading) {
        var maxLevel = 9; // TODO
        var result = {};
        for (var level = 0; level <= maxLevel; ++level) {
            result[level] = this.getKnownSpellsForClassAndLevel(classHeading, level);
        }
        return result;
    },

    getKnownSpellsForClassAndLevel: function (classHeading, level) {
        var knownSpells = this.knownSpells[classHeading][level] || [];
        knownSpells = this.concatSpellsForLevel(knownSpells, classHeading, this.categoryAssociations.Domain, this.selectedDomains, 'Domain: ', level);
        knownSpells = this.concatSpellsForLevel(knownSpells, classHeading, this.categoryAssociations.Bloodline, this.selectedBloodlines, 'Bloodline: ', level*2 + 1);
        knownSpells = this.concatSpellsForLevel(knownSpells, classHeading, this.categoryAssociations.Patron, this.selectedPatrons, 'Patron: ', level*2);
        return knownSpells;
    },

    concatSpellsForLevel: function (knownSpells, classHeading, association, list, prefix, level) {
        $.each(list, $.proxy(function (index, value) {
            if ($.isArray(value)) {
                value = value[1];
            }
            if (association && association[value] == classHeading) {
                value = prefix + value;
                if (!this.knownSpells[value]) {
                    this.knownSpells[value] = {};
                }
                if (!this.knownSpells[value][level]) {
                    this.knownSpells[value][level] = [];
                }
                knownSpells = knownSpells.concat(this.knownSpells[value][level]);
            }
        }, this));
        return knownSpells;
    },

    appendPreparedKnownSpells: function (knownDiv, classHeading, level) {
        var knownSpells = this.getKnownSpellsForClassAndLevel(classHeading, level);
        knownDiv.append($('<h4/>').text(level.ordinal() + ' level').data('level', level));
        var levelDiv = $('<div />').addClass('knownSpellsDiv')
                .droppable({ accept: '.preparedSpell', hoverClass: 'droppableHighlight' })
                .data('psb_category', classHeading);
        knownDiv.append(levelDiv);
        levelDiv.on('drop', $.proxy(this.dropSpell, this));
        $.each(knownSpells.sort().uniq(), $.proxy(function (index, spellKey) {
            var spell = this.spellData.spellById[spellKey];
            this.appendSpellLine(levelDiv, spell).addClass('knownSpells' + level)
                    .addClass(this.getDecorationClassForSpell(classHeading, spell))
                    .draggable({
                        'helper': 'clone',
                        'revert': 'invalid'
                    });
        }, this));
    },

    getDecorationClassForSpell: function (classHeading, spell) {
        var result = ' ';
        var school = spell.school.toTitleCase();
        if (this.categoryAssociations.School && this.categoryAssociations.School[school] == classHeading) {
            if (this.selectedSchools[school] == 'favoured') {
                result += 'bonus ';
            } else if (this.selectedSchools[school] == 'opposed') {
                result += 'opposed ';
            }
        }
        $.each(this.selectedDomains, $.proxy(function(index, domain) {
            if ($.isArray(domain)) {
                domain = domain[1];
            }
            if (this.categoryAssociations.Domain && this.categoryAssociations.Domain[domain] == classHeading) {
                if (this.knownSpells['Domain: ' + domain]['all'].indexOf(spell.name.toId()) >= 0) {
                    result += 'bonus ';
                }
            }
        }, this));
        return result.substr(0, result.length - 1);
    },

    appendPreparedPreparedSpells: function (preparedDiv, classHeading, level, acceptSelector) {
        var heading = $('<h4 />').append($('<span/>'))
                .attr('id', `preparedHeading_${classHeading.toId()}_${level}`)
                .droppable({ accept: acceptSelector, hoverClass: 'droppableHighlight' })
                .data('psb_category', classHeading)
                .data('psb_level', level)
                .on('drop', $.proxy(this.dropSpell, this));
        preparedDiv.append(heading);
        var levelDiv = $('<div />').addClass('preparedSpellsDiv')
                .droppable({ accept: acceptSelector, hoverClass: 'droppableHighlight' })
                .data('psb_category', classHeading)
                .data('psb_level', level)
                .on('drop', $.proxy(this.dropSpell, this));
        preparedDiv.append(levelDiv);
        this.updatePreparedHeading(classHeading, level);
        $.each(this.copy.preparedSpells[classHeading][level].sort(), $.proxy(function (index, spellKey) {
            if (spellKey.indexOf('!') == spellKey.length - 1) {
                spellKey = spellKey.substr(0, spellKey.length - 1);
            }
            var spell = this.spellData.spellById[spellKey];
            this.addPreparedSpell(levelDiv, spell, level, classHeading);
        }, this));
    },

    addPreparedSpell: function (element, spell, level, category) {
        var spellLevel = this.getSpellLevel(category, spell);
        var overLevel = level - spellLevel;
        this.appendSpellLine(element, spell, undefined, overLevel)
                .data('psb_preparedLevel', level)
                .addClass('preparedSpell')
                .addClass(this.getDecorationClassForSpell(category, spell))
                .draggable({
                    'containment': '.prepareCategory.' + category.toId(),
                    'revert': 'invalid'
                });
        this.updatePreparedHeading(category, level);
    },

    clearPreparedSpells: function (evt) {
        var element = $(evt.target).closest('h3,h4').next();
        element.find('.preparedSpell').remove();
        var category = element.data('category');
        this.copy.preparedSpells[category] = {};
        var maxLevel = 9; // TODO
        for (var level = 0; level <= maxLevel; ++level) {
            this.copy.preparedSpells[category][level] = [];
            this.updatePreparedHeading(category, level);
        }
        evt.stopPropagation();
    },

    calculatePreparedSlotsLeft: function (classHeading, level) {
        var slots = this.classSlots[classHeading].slots[level];
        var favouredSchool = Object.keys(this.selectedSchools).find($.proxy(function (school) {
             return (this.categoryAssociations.School && this.categoryAssociations.School[school] == classHeading &&
                this.selectedSchools[school] == 'favoured');
        }, this));
        var hasSchoolSlot = level > 0 && favouredSchool;
        var hasDomainSlot = level > 0 && this.selectedDomains.findIndex($.proxy(function (domain) {
            if ($.isArray(domain)) {
                domain = domain[1];
            }
            return (this.categoryAssociations.Domain && this.categoryAssociations.Domain[domain] == classHeading);
        }, this)) >= 0;
        var prepared = ((this.copy && this.copy.preparedSpells) || this.preparedSpells)[classHeading][level];
        $.each(prepared, $.proxy(function (index, spellKey) {
            var spell = this.spellData.spellById[spellKey];
            var school = spell.school.toTitleCase();
            if (this.categoryAssociations.School && this.categoryAssociations.School[school] == classHeading) {
                var affinity = this.selectedSchools[school];
                if (affinity == 'favoured' && level > 0 && hasSchoolSlot) {
                    hasSchoolSlot = false;
                    return;
                } else if (affinity == 'opposed') {
                    slots -= 2;
                    return;
                }
            }
            if (hasDomainSlot) {
                var domainMatch = $.grep(this.selectedDomains, $.proxy(function (domain) {
                    if ($.isArray(domain)) {
                        domain = domain[1];
                    }
                    if (this.categoryAssociations.Domain[domain] != classHeading) {
                        return false;
                    }
                    return (this.knownSpells['Domain: ' + domain]['all'].indexOf(spellKey) >= 0)
                }, this ));
                if (domainMatch.length > 0) {
                    hasDomainSlot = false;
                    return
                }
            }
            // Otherwise, just use up a regular slot
            slots--;
        }, this));
        var extra = '';
        if (hasSchoolSlot) {
            extra += ' 1 ' + favouredSchool + ' slot';
        }
        if (hasDomainSlot) {
            if (extra) {
                extra += ' and';
            }
            extra += ' 1 domain slot';
        }
        return [slots, extra];
    },

    updatePreparedHeading: function (category, level) {
        var preparedHeading = $(`#preparedHeading_${category.toId()}_${level}`);
        var slotUsage = this.calculatePreparedSlotsLeft(category, level);
        var text = level.ordinal() + ' level:' + this.getPreparedSlotsLeftText(slotUsage);
        var slotsLeft = slotUsage[0];
        var extra = slotUsage[1];
        preparedHeading.find('span').text(text);
        if (slotsLeft < 0) {
            preparedHeading.addClass('negativeSlots');
        } else {
            preparedHeading.removeClass('negativeSlots');
        }
    },

    getPreparedSlotsLeftText: function (slotUsage) {
        var slotsLeft = slotUsage[0];
        var extra = slotUsage[1];
        var text = '';
        var slots = (slotsLeft == -1 || slotsLeft == 1) ? ' slot' : ' slots';
        if (slotsLeft < 0 && extra) {
            text += extra + ' remaining but ' + -slotsLeft + slots + ' over!';
        } else if (slotsLeft < 0) {
            text += ' ' + -slotsLeft + slots + ' over!';
        } else if (slotsLeft == 0 && extra) {
            text += extra + ' remaining';
        } else if (slotsLeft == 0) {
            text += ' no slots remaining';
        } else {
            if (extra) {
                if (extra.indexOf(' and') >= 0) {
                    extra = ',' + extra;
                } else {
                    extra = ' and' + extra;
                }
            }
            text +=' ' + slotsLeft + slots + extra + ' remaining';
        }
        return text;
    },

    dropSpell: function (evt, ui) {
        var droppable = $(evt.target);
        var category = droppable.data('psb_category');
        var spellName = ui.draggable.find('.title').text();
        var spellKey = spellName.toId();
        var spell = this.spellData.spellById[spellKey];
        var level;
        if (droppable.is('.knownSpellsDiv')) {
            ui.draggable.hide();
            level = $(ui.draggable.context).data('psb_preparedLevel');
            var index = this.copy.preparedSpells[category][level].indexOf(spellKey);
            if (index >= 0) {
                this.copy.preparedSpells[category][level].splice(index, 1);
                this.updatePreparedHeading(category, level);
            }
        } else {
            level = droppable.data('psb_level');
            if (!this.copy.preparedSpells[category]) {
                this.copy.preparedSpells[category] = {};
            }
            if (!this.copy.preparedSpells[category][level]) {
                this.copy.preparedSpells[category][level] = [];
            }
            this.copy.preparedSpells[category][level].push(spellKey);
            var target = evt.currentTarget;
            if (target.tagName.toLowerCase() == 'h4') {
                target = $(target).next();
            } else {
                target = $(target);
            }
            this.addPreparedSpell(target, spell, level, category);
            target.children().sort(function (o1, o2) {
                var v1 = $(o1).find('.title').text();
                var v2 = $(o2).find('.title').text();
                if (v1 < v2) {
                    return -1;
                } else if (v1 > v2) {
                    return 1;
                } else {
                    return 0;
                }
            }).detach().appendTo(target);
        }
    },

    onPrepareSpellsApplyButton: function () {
        this.preparedSpells = this.copy.preparedSpells;
        this.copy = null;
        this.storage.set(BookKeys.keyPreparedSpells, this.preparedSpells);
        this.back();
    },

    showSpellStorePanel: function () {
        this.showLoading($('#spellStore'), $.proxy(this.populateSpellStorePanel, this));
    },

    populateSpellStorePanel: function () {
        $('#spellStore .ui-sortable').sortable('destroy');
        $.each(this.savedSpellListNames, $.proxy(function (index, listName) {
            this.appendSavedList(listName);
        }, this));
        $('#spellStore').sortable({
            axis: 'y',
            containment: 'parent',
            helper: function(evt, element) {
                return $(element).clone().position({ my: "left", at: "left", of: element });
            },
            stop: $.proxy(function (evt, ui) {
                this.savedSpellListNames = $('.savedSpellLists').map(function () { return $(this).data('name') } ).get();
                this.storage.set(BookKeys.keySavedSpellListNames, this.savedSpellListNames);
            }, this)
        });
    },

    appendSavedList: function (listName) {
        var listElt = $('<div/>').addClass('savedSpellLists').text(listName).data('name', listName);
        $('#spellStore').append(listElt);
        listElt.on('tap', $.proxy(function (evt) {
            $('.selectedSpellList').removeClass('selectedSpellList');
            $(evt.currentTarget).addClass('selectedSpellList');
        }, this));
    },

    onSpellStoreSaveButton: function (evt) {
        var selectedName = $('.selectedSpellList').data('name') || undefined;
        var listName = window.prompt("Enter a name for your saved spell list.", selectedName).trim();
        if (listName) {
            if (this.savedSpellLists[listName]) {
                if (!window.confirm('Overwrite ' + listName + ' list?')) {
                    return;
                }
            } else {
                this.savedSpellListNames.push(listName);
                this.storage.set(BookKeys.keySavedSpellLists, this.savedSpellLists);
            }
            var list = this.copy.preparedSpells || this.preparedSpells;
            this.savedSpellLists[listName] = $.extend(true, {}, list);
            this.storage.set(BookKeys.keySavedSpellListNames, this.savedSpellListNames);
            this.appendSavedList(listName);
        }
    },

    onSpellStoreLoadButton: function (evt) {
        var selectedName = $('.selectedSpellList').data('name');
        if (selectedName) {
            this.copy = {
                preparedSpells: $.extend(true, {}, this.savedSpellLists[selectedName])
            };
            this.back();
        }
    },

    onSpellStoreDeleteButton: function (evt) {
        var selectedName = $('.selectedSpellList').data('name');
        if (selectedName && window.confirm('Delete saved "' + selectedName + '" list?')) {
            var index = this.savedSpellListNames.indexOf(selectedName);
            if (index >= 0) {
                this.savedSpellListNames.splice(index, 1);
                delete(this.savedSpellLists[selectedName]);
                this.storage.set(BookKeys.keySavedSpellListNames, this.savedSpellListNames);
                this.storage.set(BookKeys.keySavedSpellLists, this.savedSpellLists);
                $('.selectedSpellList').remove();
            }
        }
    }

});

//=========================================================================================


$(document).ready(function () {
    var globalSettings = new Storage();
    globalSettings.setDefault('dataSize', 8003493);
    $('#loadingMessage').text('Loading spell list from pathfindercommunity.net...');
    $('#progress').progressbar({ max: globalSettings.get('dataSize'), value: 0 });
    $('#loading').show();
    // Now load the data.
    $.ajax({
        url: 'https://spreadsheets.google.com/pub?key=0AhwDI9kFz9SddG5GNlY5bGNoS2VKVC11YXhMLTlDLUE&output=csv',
        xhr: function () {
            var xhr = new window.XMLHttpRequest();
            xhr.addEventListener('progress', function (evt) {
                $('#progress').progressbar('option', 'value', evt.loaded);
            });
            return xhr;
        },
        dataType: 'text'
    })
    .then(function (data) {
        globalSettings.set('dataSize', data.length);
        $('#loadingMessage').text('Parsing CSV...');
        $('#progress').progressbar('option', 'value', 0);
        var nextNewline = data.indexOf('\r') + 2;
        var headingRow = data.substring(0, nextNewline);
        var chunkLen = parseInt(data.length / 100);
        var chunks = [];
        for (var pos = nextNewline; pos < data.length; ) {
            nextNewline = data.indexOf('\r', pos + chunkLen) + 2;
            if (nextNewline > 1) {
                chunks.push(data.substring(pos, nextNewline));
                pos = nextNewline;
            } else {
                chunks.push(data.substring(pos));
                pos = data.length;
            }
        }
        $('#progress').progressbar('option', 'max', chunks.length);
        return $.Deferred(function (defer) {
            var chunkIndex = -1;
            var progress = 0;
            var headings;
            var spellList = [];
            var loop = function () {
                if (chunkIndex == -1) {
                    $.csv.toArray(headingRow, {}, function (err, arr) {
                        if (err) {
                            defer.reject(err);
                        } else {
                            headings = arr;
                            window.setTimeout(loop, 0);
                        }
                    });
                } else {
                    var chunk = headingRow + chunks[chunkIndex];
                    $.csv.toObjects(chunk, {}, function (err, objects) {
                        if (err) {
                            defer.reject(err);
                        } else {
                            spellList = spellList.concat(objects);
                            if (chunkIndex >= chunks.length) {
                                defer.resolve(headings, spellList);
                            } else {
                                window.setTimeout(loop, 0);
                            }
                        }
                    });
                }
                $('#progress').progressbar('option', 'value', ++chunkIndex);
            }
            loop();
        });
    })
    .then(function (headings, spellList) {
        $('#loadingMessage').text('Processing spell data...');
        $('#progress').progressbar('option', 'max', spellList.length);
        $('#progress').progressbar('option', 'value', 0);
        var spellData = new SpellData(headings, spellList, function (index) {
            $('#progress').progressbar('option', 'value', index);
        });
        new TopMenu(globalSettings, spellData);
    })
    .fail(function (err) {
        $('#loading').text('Error: ' + err);
    });
    /*
    $('.panel').hide();
    $.csv.toObjects(globalSpellCsv, {}, function (err, spellList) {
        if (err) {
            console.error(err);
        } else {
            var headingRow = globalSpellCsv.substring(0, globalSpellCsv.search(/[\r\n]/));
            $.csv.toArray(headingRow, {}, function (err, headings) {
                if (err) {
                    console.error(err);
                } else {
                    new TopMenu(globalSettings, new SpellData(headings, spellList));
                }
            });
        }
    });
    */
});
