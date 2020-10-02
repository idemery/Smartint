base64 = new Nibbler({
    dataBits: 8,
    codeBits: 6,
    keyString: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    pad: ''
});

function lcidToLanguage(lcid) {
    switch (lcid) {
        case 1025:
            return 'ar';        // Arabic
        case 1026:
            return 'bg';        // Bulgarian
        case 1027:
            return 'ca';        // Catalan
        case 1029:
            return 'cs';        // Czech
        case 1031:
            return 'de';        // German
        case 1033:
            return 'en';        // English
        case 1034:
            return 'es';        // Spanish
        case 1036:
            return 'fr';        // French
        case 1038:
            return 'hu';        // Hungarian
        case 1040:
            return 'it';        // Italian
        case 1041:
            return 'jp';        // Japanese
        case 1042:
            return 'ko';        // Korean
        case 1043:
            return 'nl';        // Dutch
        case 1044:
            return 'no';        // Norwegian
        case 1045:
            return 'pl';        // Polish
        case 1046:
            return 'pt_BR';     // Brazilian
        case 1049:
            return 'ru';        // Russian
        case 1055:
            return 'tr';        // Turkish
        case 1065:
            return 'fa';        // Persian-Farsi
        case 2052:
            return 'zh_CN';     // Simplified Chinese
        default:
            return 'en';
    }
}

function run_smartint(lcid, etn, name, license, consumerKey, consumerSecret, token_data, disable_left_navigation, display_name) {
    var elfinder_smartint_options = {
        url: 'php/connector.php',
        lang: lcidToLanguage(lcid),
        title: name,
        customData: {
            rootTarget: "/" + display_name + "/" + name,
            dropboxRoot: "sandbox",
            rootFolder: name,
            token_data: token_data,
            consumerKey: consumerKey,
            consumerSecret: consumerSecret,
            license: license
        },
        commands: [
            'open', 'reload', 'home', 'up', 'back', 'forward',
            'sim',
            'download', 'rm',
            'rename',
            'mkdir',
            'upload', 'copy', 'cut', 'paste',
            'sort'
        ],
        commandsOptions: {
            help: {
                //view: ['about', 'shortcuts', 'help']
                view: ['shortcuts']
            }
        },
        uiOptions: {
            toolbar: [
                ['back', 'forward'],
                ['reload'],
                ['home', 'up'],
                ['mkdir', 'upload'],
                ['open', 'download'],
                ['sim'],
                ['rename', 'copy', 'cut', 'paste'],
                ['rm'],
                ['help']
            ],
            tree: {
                openRootOnLoad: true,
                syncTree: true
            },
            navbar: {
                minWidth: 150,
                maxWidth: 380
            },
            cwd: {
                oldSchool: false
            }
        },
        contextmenu: {
            navbar: ['open', '|', 'rename', 'copy', 'cut', 'paste', '|', 'rm'],
            cwd: ['reload', 'back', '|', 'upload', 'mkdir', 'paste'],
            files: [
                'open', '|', 'download', '|', 'sim', '|', 'rename', 'copy', 'cut', 'paste', '|', 'rm'
            ]
        },
        notifyDelay: 100,
        allowNav: 1
    };

    window.elfinder_global_instance = $('#smartint').elfinder(elfinder_smartint_options).elfinder('instance');

    if (disable_left_navigation) {
        $("#smartint .elfinder-navbar").hide();
    }
    
}

function prepare_field_name(lcid, etn, license, consumerKey, consumerSecret, token_data, disable_left_navigation, display_name) {

    var name_field_name, name;

    var
        entity = "qg_smartintcustomentity",
        select = "?$select=qg_FieldName&$filter=qg_EntityName eq '" + etn + "'",
        oDataSelect,
        serverUrl = window.parent.Xrm.Page.context.getClientUrl();
    oDataSelect = serverUrl + "/XRMServices/2011/OrganizationData.svc/" + entity + "Set" + select + "";

    $.ajax({
        type: "GET",
        contentType: "application/json; charset=utf-8",
        datatype: "json",
        url: oDataSelect,
        beforeSend: function (XMLHttpRequest) { XMLHttpRequest.setRequestHeader("Accept", "application/json"); },
        success: function (data, textStatus, XmlHttpRequest) {

            var results = data.d.results;
            var firstResult = results[0];
            if (firstResult != null) {
                name_field_name = firstResult.qg_FieldName;

                if (name_field_name && window.parent.Xrm.Page.getAttribute(name_field_name)) {
                    name = window.parent.Xrm.Page.getAttribute(name_field_name).getValue();

                    run_smartint(lcid, etn, name, license, consumerKey, consumerSecret, token_data, disable_left_navigation, display_name);

                }
                else {
                    alert("No data found for field: " + name_field_name + " and entity: " + etn);
                }
            }
            else {
                alert("No field name was found for entity: " + etn);
            }
        },
        error: function (xmlHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus + "; ErrorThrown: " + errorThrown);
        }
    });
}

function prepare_entity_display_name(lcid, etn, license, consumerKey, consumerSecret, token_data, use_custom_fields, disable_left_navigation) {
    

    SDK.Metadata.RetrieveEntity(SDK.Metadata.EntityFilters.Entity, etn, null, false,
    function (entityMetadata) {
        
        var display_name = entityMetadata.DisplayCollectionName.UserLocalizedLabel.Label;
        
        if (use_custom_fields) {
            prepare_field_name(lcid, etn, license, consumerKey, consumerSecret, token_data, disable_left_navigation, display_name);
        }
        else {

            if (!window.parent.Xrm.Page.getAttribute(entityMetadata.PrimaryNameAttribute)) {
                alert("Primary attribute was not found: " + entityMetadata.PrimaryNameAttribute);
                return;
            }

            var name = window.parent.Xrm.Page.getAttribute(entityMetadata.PrimaryNameAttribute).getValue();
            run_smartint(lcid, etn, name, license, consumerKey, consumerSecret, token_data, disable_left_navigation, display_name);
        }

        
    },
    function (error) {
        alert(error.message);
    });


}

function check_license(lcid, etn, settings) {
    $.getJSON("http://quitegeek.com/?edd_action=check_license&item_name=Smartint%202&license=" + settings.qg_License + "&url=" + window.location.origin, function (data) {
        if (!data) {
            alert("Smartint is down, This rarely happens. Please try again in few seconds.");
            return;
        }

        if (data.license == "valid") {
            var consumerKey = data.consumer_key;
            var consumerSecret = data.consumer_secret;

            prepare_entity_display_name(lcid, etn, settings.qg_License, consumerKey, consumerSecret, settings.qg_token, settings.qg_FieldOfFolderName, settings.qg_DisableLeftNavigationPanel);
        }
        else {
            alert("Your license is invalid. If you believe that your license is valid, please contact our support.");
        }

    });
}

function prepare_settings(lcid, etn) {
    var
        entity = "qg_smartintsettings",
        select = "?$select=qg_token,qg_License,qg_FieldOfFolderName,qg_DisableLeftNavigationPanel&$orderby=ModifiedOn desc&$top=1",
        oDataSelect,
        serverUrl = window.parent.Xrm.Page.context.getClientUrl();
    oDataSelect = serverUrl + "/XRMServices/2011/OrganizationData.svc/" + entity + "Set" + select + "";

    $.ajax({
        type: "GET",
        contentType: "application/json; charset=utf-8",
        datatype: "json",
        url: oDataSelect,
        beforeSend: function (XMLHttpRequest) { XMLHttpRequest.setRequestHeader("Accept", "application/json"); },
        success: function (data, textStatus, XmlHttpRequest) {
            
            var results = data.d.results;
            var settings = results[0];
            if (settings != null) {
                
                check_license(lcid, etn, settings);
            }
            else {
                alert("No settings were found");
            }
        },
        error: function (xmlHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus + "; ErrorThrown: " + errorThrown);
        }
    });
}

$(function () {

    var
        lcid = window.parent.Xrm.Page.context.getUserLcid(),
        etn = window.parent.Xrm.Page.data.entity.getEntityName();

    prepare_settings(lcid, etn);

});