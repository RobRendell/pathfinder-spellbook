
String.prototype.toId = function() {
    return this.replace(/[^a-zA-Z0-9]/g, '_');
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
        if (value instanceof Array)
            value = value.join("|");
        this.data[this.prefix + name] = value;
        $('input[name="' + name + '"]').val(value);
    },

    get: function (name) {
        return this.data[this.prefix + name];
    },

    getInt: function (name) {
        return parseInt(this.get(name));
    },

    getArray: function (name) {
        var result = this.data[this.prefix + name];
        if (result)
            return result.split("|");
        else
            return [];
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

    init: function (headings, rawData) {
        this.headings = headings;
        this.rawData = rawData;
        this.classHeadings = [];
        $.each(headings, $.proxy(function (index, value) {
            if ($.inArray(value, this.fixedHeadings) < 0) {
                this.classHeadings.push(value);
            }
        }, this));
        console.log('Class headings: ' + this.classHeadings.join(', '));
        var sources = {};
        $.each(rawData, function (index, spell) {
            sources[spell.source] = 1;
        });
        this.sources = Object.keys(sources).sort($.proxy(this.sourceSort, this));
        console.log('Sources: ' + this.sources.join(', '));
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
    }

});

var BookKeys = {
    keyBookIDs: 'bookIDs',
    keyBookName: 'bookName',
};

var TopMenu = Class.create({

    defaultBookName: 'My Spellbook',

    init: function (globalSettings, spellData) {
        this.globalSettings = globalSettings;
        this.spellData = spellData;
        this.bookData = {};
        this.bookPanel = {};
        var ids = globalSettings.getArray(BookKeys.keyBookIDs);
        $.each(ids, $.proxy(function (index, id) {
            this.bookData[id] = new Storage(id);
        }, this));
        this.refresh();
    },

    refresh: function () {
        var topdiv = $('#spellbooks');
        topdiv.fadeIn();
        topdiv.html();
        this.addNewBookButton();
        $.each(this.bookData, $.proxy(function (id, storage) {
            this.addBookButton(id, storage);
        }, this));
    },

    addNewBookButton: function () {
        var button = $('<div class="book"></div>');
        button.append($('<img src="newBook.png" />'));
        button.append($('<div></div>').text('New spellbook'));
        button.on('click touch', $.proxy(this.newSpellbookClicked, this));
        $('#spellbooks').append(button);
        this.newBookButton = button;
    },

    newSpellbookClicked: function (evt) {
        var id = this.getNewBookID();
        var storage = new Storage(id);
        this.bookData[id] = storage;
        this.globalSettings.set(BookKeys.keyBookIDs, Object.keys(this.bookData));
        storage.set(BookKeys.keyBookName, this.defaultBookName);
        this.addBookButton(id, storage);
    },

    getNewBookID: function () {
        var id;
        do {
            id = 'book' + Math.random().toFixed(8);
        } while (this.bookData[id]);
        return id;
    },

    addBookButton: function (id, storage) {
        var text = storage.get(BookKeys.keyBookName);
        var button = $('<div class="book"></div>');
        button.attr('id', id);
        button.append($('<img src="book.png" />'));
        button.append($('<div></div>').text(text));
        button.on('click touch', $.proxy(this.spellbookClicked, this));
        this.newBookButton.before(button);
    },

    spellbookClicked: function (evt) {
        var target = evt.currentTarget;
        var id = $(target).attr('id');
        if (!this.bookPanel[id]) {
            this.bookPanel[id] = new BookPanel(id, this.bookData[id], this.spellData);
        }
        this.bookPanel[id].show();
    }

});

var BookPanel = Class.create({
    init: function (id, storage, spellData) {
        this.id = id;
        this.storage = storage;
        this.spellData = spellData;
    },

    show: function () {
        $('#spellbooks').fadeOut();
        var bookName = this.storage.get(BookKeys.keyBookName);
        $('#bookPanelTitle').text(bookName);
        var bookPanel = $('#bookPanel');
        bookPanel.fadeIn();
    }
});

//=========================================================================================


$(document).ready(function () {
    var globalSettings = new Storage();
    globalSettings.setDefault('dataSize', 8003493);
    $('#loadingMessage').text('Loading spell list from pathfindercommunity.net...');
    $('#progress').progressbar({ max: globalSettings.getInt('dataSize'), value: 0 });
    // Now load the data.
    /*
    $.ajax({
        url: 'https://spreadsheets.google.com/pub?key=0AhwDI9kFz9SddG5GNlY5bGNoS2VKVC11YXhMLTlDLUE&output=csv',
        xhr: function () {
            var xhr = new window.XMLHttpRequest();
            xhr.addEventListener('progress', function (evt) {
                $('#progress').progressbar('value', evt.loaded);
            });
            return xhr;
        }
    })
    .then(function (data) {
        $('#progress').progressbar('value', globalSettings.getInt('dataSize'));
        globalSettings.set('dataSize', data.length);
        $('#loading').fadeOut();
        return $.Deferred(function (defer) {
            $.csv.toObjects(data, {}, function (err, objects) {
                if (err) {
                    defer.reject(err);
                } else {
                    defer.resolve(data, objects);
                }
            });
        });
    })
    .then(function (data, spellList) {
        return $.Deferred(function (defer) {
            var headingRow = data.substring(0, data.search(/[\r\n]/));
            $.csv.toArray(headingRow, {}, function (err, headings) {
                if (err) {
                    defer.reject(err);
                } else {
                    defer.resolve(headings, spellList);
                }
            });
        });
    })
    .then(function (headings, spellList) {
        var spellData = new SpellData(headings, spellList);
        new TopMenu(globalSettings, spellData);
    })
    .fail(function (err) {
        $('#loading').text('Error: ' + err);
        $('#loading').fadeIn();
    });
    */
    $('#loading').hide();
    new TopMenu(globalSettings, {});
});
