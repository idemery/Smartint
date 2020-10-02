var consumerKey, consumerSecret;

/* 
    Implement your logic here to get 'consumerKey' and 'consumerSecret' or just copy paste them from Dropbox. 

    Below is my implementation to fetch them based on a user license.
*/

$(function () {

    retrieveEntities();

    var license = prompt("Please enter your license key to activate Smartint, or ignore this message if Smartint has been already activated.");
    if (license && license != null) {

        $.getJSON("http://myDomain.com/?edd_action=activate_license&item_name=Smartint%202&license=" + license + "&url=" + window.location.origin, function (data) {
            if (!data) {
                alert("Error activating Smartint, Please contact our support.");
                return;
            }

            if (data.license == "valid") {
                consumerKey = data.consumer_key;
                consumerSecret = data.consumer_secret;
                alert("Congratulations! Smartint has been activated successfully for customer: " + data.customer_name);

                activation_successful(license);
            }
            else {
                alert("The license provided is invalid. If you believe that your license is valid, please contact our support.");
            }

        });

    }

});

function activation_successful(license) {
    $("#reload-button").data("license", license);
    var request_token_url = sign_url("POST", "https://api.dropbox.com/1/oauth/request_token");

    $.post(request_token_url, function (data, textStatus, jqXHR) {

        var pairs = data.split(/&/);
        var result = {};
        for (var i in pairs) {
            var pair = pairs[i].split(/=/, 2);
            result[pair[0]] = pair[1];
        }

        $("#reload-button").show();
        $("#reload-button").data("request_token", result);
    });

    $("#reload-button").click(function () {
        var request_token = $("#reload-button").data("request_token");


        var authorize = $(this).data("authorize");
        if (!authorize) {
            var auth_url = "https://www.dropbox.com/1/oauth/authorize?oauth_token=" + request_token.oauth_token;
            window.open(auth_url, "_blank");
            $(this).text("I have authorized Smartint!");

            $(this).data("authorize", true);
        }
        else {

            var access_token_url = sign_url("POST", "https://api.dropbox.com/1/oauth/access_token", null, request_token);

            $.post(access_token_url, function (data, textStatus, jqXHR) {

                var pairs = data.split(/&/);
                var result = {};
                for (var i in pairs) {
                    var pair = pairs[i].split(/=/, 2);
                    result[pair[0]] = pair[1];
                }

                $("#reload-button").data("access_token", result);

                var lic = $("#reload-button").data("license");

                create_settings(data, lic);
            });

            $(this).data("authorize", false);
            $(this).text("Authorize");
        }
    });

}


function create_settings(token_data, license) {

    try {

        var settings = {
            qg_token: token_data,
            qg_License: license,
            qg_DisableLeftNavigationPanel: false,
            qg_FieldOfFolderName: false
        },
            entity = "qg_smartintsettings",
            serverUrl = window.parent.Xrm.Page.context.getClientUrl(),
            oDataSelect = serverUrl + "/XRMServices/2011/OrganizationData.svc/" + entity + "Set";

        $.ajax({
            type: "POST",
            contentType: "application/json; charset=utf-8",
            datatype: "json",
            url: oDataSelect,
            data: JSON.stringify(settings),
            beforeSend: function (XMLHttpRequest) { XMLHttpRequest.setRequestHeader("Accept", "application/json"); },
            success: function (data, textStatus, XmlHttpRequest) {

                alert("Settings have been saved successfully.");
                /*data.d*/
            },
            error: function (XmlHttpRequest, textStatus, errorThrown) {
                alert("Error on the creation of settings; Error – " + errorThrown);
                prompt("Access Token: Please save the following data", token_data);
            }
        });

    } catch (e) {
        prompt("Access Token: Please save the following data", token_data);
    }
}


function retrieveEntities() {

    SDK.Metadata.RetrieveAllEntities(SDK.Metadata.EntityFilters.Entity, true,
        function (entityMetadataCollection) {


            var arr = $.grep(entityMetadataCollection, function (e, i) {

                return (
                    e.IsActivity == false &&
                    e.IsCustomizable.Value == true &&
                    e.IsRenameable.Value == true &&
                    e.CanBePrimaryEntityInRelationship.Value == true &&
                    e.CanBeRelatedEntityInRelationship.Value == true &&
                    e.CanBeInManyToMany.Value == true &&
                    e.CanCreateAttributes.Value == true &&
                    e.CanCreateCharts.Value == true &&
                    e.CanCreateForms.Value == true &&
                    e.CanCreateViews.Value == true &&
                    e.CanModifyAdditionalSettings.Value == true &&
                    e.DisplayCollectionName &&
                    e.DisplayCollectionName.UserLocalizedLabel);

            });

            arr.sort(SortByName);


            getAllEntitiesEnabledForSmartint(function (enabled_entities) {

                var entities = [];

                for (var i = 0; i < arr.length; i++) {

                    var entity = {};
                    entity.Metadata = arr[i];
                    entity.SmartintIsEnabled = false;

                    for (var e = 0; e < enabled_entities.length; e++) {
                        if (enabled_entities[e].qg_EntityLogicalName == arr[i].LogicalName) {
                            entity.SmartintIsEnabled = true;
                        }
                    }

                    entities.push(entity);
                }

                $.tmpl('<div class="row" style="padding-top:10px;"><div class="col-lg-12"><div class="input-group"><span class="input-group-addon">' +
                '<input class="entity-check-box" type="checkbox" data-etn="${Metadata.LogicalName}" data-display-name="${Metadata.DisplayCollectionName.UserLocalizedLabel.Label}" {{if SmartintIsEnabled == true}} checked {{/if}}>' +
                '</span><span class="input-group-addon" style="border-right-width: 0px;">' +
                '<img class="entity-icon" data-etc="${Metadata.ObjectTypeCode}" data-is-custom="${Metadata.IsCustomEntity}" data-icon-url="${Metadata.IconSmallName}" data-progress-icon-url="../webresources/qg_/img/spinnermini.gif" alt="" src="../webresources/qg_/img/spinnermini.gif">' +
                '</span><span class="form-control" style="text-align: left;">${Metadata.DisplayCollectionName.UserLocalizedLabel.Label}</span></div></div></div>',
                entities).appendTo("#entities-container");
                loadIcons();

            });





        },
    function (error) {
        alert("error");
        console.log(error);
    }, null);
}

function loadIcons() {
    $(".entity-icon").each(function () {

        loadIconForImg(this);
    });
}

function loadIconForImg(img) {
    var etc = $(img).data("etc");

    if ($(img).data("is-custom")) {

        if ($(img).data("icon-url")) {
            img.src = $(img).data("icon-url");
        }
        else {
            img.src = window.parent.Xrm.Page.context.getClientUrl() + GetIconUrl(etc);
        }
    }
    else {

        img.src = GetIconUrl(etc);
    }
}

function GetIconUrl(etc) {
    /// <summary>
    /// Get the url of the 16x16 icon for the specified entity
    /// </summary>
    /// <param name="etc" type="Number">Entity type code of the entity which icon must be retrieved.</param>
    /// <returns type="String">Url of the icon.The path is relative to the application root.</returns>

    var url;
    if (etc == 4710 || etc == 9600 || etc == 4005) {
        // return a system entity icon
        url = "/_imgs/ico_16_" + etc + ".png";
    }
    else if (etc >= 10000) {
        // return a custom entity icon
        url = "/_Common/icon.aspx?objectTypeCode=" + etc + "&iconType=GridIcon&cache=1";
    } else {
        // return a system entity icon
        url = "/_imgs/ico_16_" + etc + ".gif";
    }
    return url;
}

function SortByName(a, b) {
    var aName = a.DisplayCollectionName.UserLocalizedLabel.Label.toLowerCase();
    var bName = b.DisplayCollectionName.UserLocalizedLabel.Label.toLowerCase();
    return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
}

$(function () {

    $(document).on("change", ".entity-check-box", function (e) {

        var checkbox = this;
        //if ($(checkbox).data("is-in-progress")) {
        //    e.stopPropagation();
        //    return;
        //}

        //$(checkbox).data("is-in-progress", true);

        var name = $(this).data("display-name");
        var etn = $(this).data("etn");
        var is_create = this.checked;

        var img = $(this).closest(".row").find("img").get(0);
        var progress_url = $(img).data("progress-icon-url");
        img.src = progress_url;

        if (is_create) {
            // CREATE

            enableSmartintForEntity(name, etn, function (data) {
                loadIconForImg(img);
                //$(checkbox).data("is-in-progress", false);
            }, function (XmlHttpRequest, errorThrown) {
                loadIconForImg(img);

                try {
                    alert(JSON.parse(XmlHttpRequest.responseText).error.message.value);
                } catch (e) {

                }

                console.log("Error Enabling entity: " + name);
                console.log(XmlHttpRequest);
                console.log(errorThrown);
                //$(checkbox).data("is-in-progress", false);
            });


        }
        else {
            // DELETE
            disableSmartintForEntity(etn, function (data) {
                loadIconForImg(img);
                //$(checkbox).data("is-in-progress", false);
            }, function (XmlHttpRequest, errorThrown) {
                loadIconForImg(img);
                try {
                    alert(JSON.parse(XmlHttpRequest.responseText).error.message.value);
                } catch (e) {

                }
                console.log("Error Enabling entity: " + name);
                console.log(XmlHttpRequest);
                console.log(errorThrown);
                //$(checkbox).data("is-in-progress", false);
            });
        }


    });

});

function enableSmartintForEntity(name, etn, success, error) {
    var new_entity = {
        qg_name: name,
        qg_EntityLogicalName: etn,
        qg_FormName: "",
        qg_UseCustomForm: false
    },
                entity = "qg_smartintforentity",
                serverUrl = window.parent.Xrm.Page.context.getClientUrl(),
                oDataSelect = serverUrl + "/XRMServices/2011/OrganizationData.svc/" + entity + "Set";

    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        datatype: "json",
        url: oDataSelect,
        data: JSON.stringify(new_entity),
        beforeSend: function (XMLHttpRequest) { XMLHttpRequest.setRequestHeader("Accept", "application/json"); },
        success: function (data, textStatus, XmlHttpRequest) {
            success(data);
        },
        error: function (XmlHttpRequest, textStatus, errorThrown) {
            error(XmlHttpRequest, errorThrown);
        }
    });
}

function disableSmartintForEntity(etn, success, error) {
    var
        entity = "qg_smartintforentity",
        select = "?$select=qg_smartintforentityId&$filter=qg_EntityLogicalName eq '" + etn + "'",
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

            for (var i = 0; i < results.length; i++) {
                var firstResult = results[i];
                var id = firstResult.qg_smartintforentityId;
                if (i == 0) {
                    deleteSmartintForEntity(id, success, error);
                }
                else {
                    deleteSmartintForEntity(id);
                }
            }

        },
        error: function (xmlHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus + "; ErrorThrown: " + errorThrown);
            console.log(xmlHttpRequest);
            error(xmlHttpRequest, errorThrown);
        }
    });
}

function deleteSmartintForEntity(id, success, error) {

    var
        entity = "qg_smartintforentity",
        oDataSelect,
        serverUrl = window.parent.Xrm.Page.context.getClientUrl();
    oDataSelect = serverUrl + "/XRMServices/2011/OrganizationData.svc/" + entity + "Set";

    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        datatype: "json",
        url: oDataSelect + "(guid'" + id + "')",
        beforeSend: function (XMLHttpRequest) {
            XMLHttpRequest.setRequestHeader("Accept", "application/json");
            XMLHttpRequest.setRequestHeader("X-HTTP-Method", "DELETE");
        },
        success: function (data, textStatus, XmlHttpRequest) {
            if (success) {
                success(data);
            }
        },
        error: function (xmlHttpRequest, textStatus, errorThrown) {
            if (error) {
                error(xmlHttpRequest, errorThrown);
            }
        }
    });
}

function getAllEntitiesEnabledForSmartint(success) {
    var
        entity = "qg_smartintforentity",
        select = "?$select=qg_smartintforentityId,qg_EntityLogicalName",
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
            success(results);

        },
        error: function (xmlHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus + "; ErrorThrown: " + errorThrown);
            console.log(xmlHttpRequest);
        }
    });
}

var auth_msg = function (method, url, data, token) {
    var message = {
        method: method,
        action: url,
        parameters: {
            oauth_consumer_key: consumerKey,
            oauth_signature_method: "HMAC-SHA1"
        }
    };
    var accessor = {
        consumerSecret: consumerSecret,
    };

    if (token) {
        message.parameters.oauth_token = token.oauth_token;
        accessor.tokenSecret = token.oauth_token_secret;
    }

    if (data) {
        for (var key in data)
            message.parameters[key] = data[key];
    }

    OAuth.setTimestampAndNonce(message);
    OAuth.SignatureMethod.sign(message, accessor);

    return message;
};

var sign_url = function (method, url, data, token) {
    var message = auth_msg(method, url, data, token);
    var params = OAuth.getParameterMap(message.parameters);
    if (params) {
        var pList = [];
        for (var key in params)
            pList.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
        params = (pList.length > 0) ? pList.join("&").replace(/%20/g, "+") : null;
    }

    url += "?" + params;
    return url;
};