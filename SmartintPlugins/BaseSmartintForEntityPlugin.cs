// <copyright file="PreSmartintForEntityCreate.cs" company="QUITEGEEK">
// Copyright (c) 2013 All Rights Reserved
// </copyright>
// <author>Islam Eldemery</author>
// <date>11/26/2013 10:00:53 PM</date>
// <summary>Base Plugin.</summary>

namespace Smartint.SmartintPlugins
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.ServiceModel;
    using Microsoft.Xrm.Sdk;
    using Microsoft.Crm.Sdk.Messages;
    using Microsoft.Xrm.Sdk.Query;
    using System.Xml.Linq;
    using System.Xml.Serialization;
    using System.Xml;
    using System.IO;


    public class BaseSmartintForEntityPlugin : Plugin
    {
        public BaseSmartintForEntityPlugin(Type childClassName)
            : base(childClassName)
        {

        }

        #region CONSTANTS
        protected const string AREA_ID = "Info";
        protected const string SMARTINT_URL = "$webresource:qg_smartint.html";
        protected const string SMARTINT_ICON = "$webresource:qg_/img/Dropbox16X16.png";
        #endregion

        #region TARGET ENTITY

        protected Entity GetTargetEntity(LocalPluginContext localContext)
        {
            if (localContext == null)
            {
                throw new ArgumentNullException("localContext");
            }

            Entity entity;

            if (localContext.PluginExecutionContext.InputParameters.Contains("Target") && localContext.PluginExecutionContext.InputParameters["Target"] is Entity)
            {
                entity = (Entity)localContext.PluginExecutionContext.InputParameters["Target"];
            }
            else if (localContext.PluginExecutionContext.InputParameters.Contains("Target") && localContext.PluginExecutionContext.InputParameters["Target"] is EntityReference)
            {
                EntityReference entityRef = (EntityReference)localContext.PluginExecutionContext.InputParameters["Target"];
                entity = localContext.OrganizationService.Retrieve(entityRef.LogicalName, entityRef.Id, new ColumnSet("qg_entitylogicalname", "qg_formname", "qg_usecustomform"));
            }
            else
            {
                entity = null;
            }

            if (entity.LogicalName != "qg_smartintforentity")
            {
                entity = null;
            }

            return entity;
        }

        protected Tuple<string, string, bool> GetEntityInfo(Entity entity)
        {
            string entityName = entity.GetAttributeValue<string>("qg_entitylogicalname");
            string formName = entity.GetAttributeValue<string>("qg_formname");
            bool useDefault = !entity.GetAttributeValue<bool>("qg_usecustomform");

            return new Tuple<string, string, bool>(entityName, formName, useDefault);
        }

        #endregion

        #region MANIPULATE FORM

        protected FormType FixFormNavigation(FormType form)
        {
            if (form == null)
            {
                throw new InvalidPluginExecutionException(string.Format("System Form is null at Fix Form Navigation"));
            }

            if (form.Navigation == null)
            {
                form.Navigation = new FormNavigationType();
            }

            if (form.Navigation.NavBar == null)
            {
                form.Navigation.NavBar = new FormNavBarType
                                   {
                                       Items = new List<object>().ToArray()
                                   };
            }

            return form;
        }

        protected object[] AddItem(object[] items)
        {
            if (items == null)
            {
                items = new List<object>().ToArray();
            }

            if (IsItemAlreadyThere(items)) return items;

            return new List<object>(items) 
            {
                new FormNavBarTypeNavBarItem
                {
                    Area = AREA_ID,
                    AvailableOffline = false,
                    AvailableOfflineSpecified = false,
                    Icon = SMARTINT_ICON,
                    Id = string.Format("navLink{{{0}}}", Guid.NewGuid()),
                    Sequence = "1",
                    Url = SMARTINT_URL,
                    Titles = new FormLocalizedTitles 
                    {
                        Title = new List<FormLocalizedLabel> 
                        {
                            new FormLocalizedLabel { LCID = "1033", Text = "Dropbox" }
                        }.ToArray()
                    }
                }
            }.ToArray();
        }

        protected object[] RemoveItem(object[] items)
        {
            if (!IsItemAlreadyThere(items)) return items;

            List<object> new_items = new List<object>();

            foreach (object item in items)
            {
                if (item is FormNavBarTypeNavBarItem)
                {
                    var navItem = (FormNavBarTypeNavBarItem)item;
                    if (!string.IsNullOrEmpty(navItem.Url) && navItem.Url.Equals(SMARTINT_URL, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }
                }

                new_items.Add(item);
            }

            return new_items.ToArray();
        }

        protected bool IsItemAlreadyThere(object[] items)
        {
            foreach (object item in items)
            {
                if (item is FormNavBarTypeNavBarItem)
                {
                    var navItem = (FormNavBarTypeNavBarItem)item;
                    if (!string.IsNullOrEmpty(navItem.Url) && navItem.Url.Equals(SMARTINT_URL, StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }
                }
            }
            return false;
        }

        #endregion

        #region SERIALIZE, DESERIALIZE XML

        protected T Deserialize<T>(string toDeserialize)
        {
            XDocument doc = XDocument.Parse(toDeserialize);
            XmlSerializer xmlSerializer = new XmlSerializer(typeof(T));

            using (var reader = doc.Root.CreateReader())
            {
                return (T)xmlSerializer.Deserialize(reader);
            }
        }

        protected string Serialize<T>(T toSerialize)
        {
            XmlWriterSettings settings = new XmlWriterSettings();
            settings.OmitXmlDeclaration = true;

            MemoryStream ms = new MemoryStream();

            XmlWriter writer = XmlWriter.Create(ms, settings);
            XmlSerializerNamespaces names = new XmlSerializerNamespaces();
            names.Add("", "");

            XmlSerializer cs = new XmlSerializer(toSerialize.GetType());
            cs.Serialize(writer, toSerialize, names);
            ms.Flush();
            ms.Seek(0, SeekOrigin.Begin);

            StreamReader sr = new StreamReader(ms);

            try
            {
                string xml = sr.ReadToEnd();

                return xml;
            }
            finally
            {
                writer.Close();
                sr.Close();
                ms.Close();
            }
        }

        #endregion

        #region GET, UPDATE, PUBLISH FORM

        protected SystemForm GetSystemForm(LocalPluginContext localContext, Tuple<string, string, bool> entityInfo)
        {
            QueryExpression q = new QueryExpression(SystemForm.EntityLogicalName);
            q.EntityName = SystemForm.EntityLogicalName;
            q.ColumnSet = new ColumnSet("formxml");
            q.Criteria.AddCondition("objecttypecode", ConditionOperator.Equal, entityInfo.Item1);
            q.Criteria.AddCondition("type", ConditionOperator.Equal, "2");

            if (entityInfo.Item3)
            {
                q.AddOrder("publishedon", OrderType.Ascending);
            }
            else
            {
                q.Criteria.AddCondition("name", ConditionOperator.Equal, entityInfo.Item2);
            }


            EntityCollection entityCollection = localContext.OrganizationService.RetrieveMultiple(q);
            SystemForm systemForm = entityCollection.Entities.FirstOrDefault() as SystemForm;
            if (systemForm == null)
            {
                throw new InvalidPluginExecutionException(string.Format("No form found for entity"));
            }
            return systemForm;
        }

        protected void UpdateSystemForm(LocalPluginContext localContext, SystemForm systemForm)
        {
            localContext.OrganizationService.Update(systemForm);
        }

        protected void PublishSystemForm(LocalPluginContext localContext, string entityName)
        {
            PublishXmlRequest publishRequest = new PublishXmlRequest();
            publishRequest.ParameterXml = "<importexportxml>" +
            "    <entities>" +
            "        <entity>" + entityName + "</entity>" +
            "    </entities>" +
            "    <nodes/>" +
            "    <securityroles/>  " +
            "    <settings/>" +
            "    <workflows/>" +
            "</importexportxml>";
            try
            {
                localContext.OrganizationService.Execute(publishRequest);
            }
            catch (Exception ex)
            {
                throw new InvalidPluginExecutionException(ex.Message);
            }
        }

        #endregion
    }
}
