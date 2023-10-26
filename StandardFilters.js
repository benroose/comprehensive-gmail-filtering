/**
 * Abstracted intelligent message tagger
 * Uses an Object map to define what to match and what labels to apply
 * @param {Object} MAP    Object map of the rules to match
 * @param {GmailThread} Thread    The GMailThread the message belongs to
 * @param {GmailMessage} Email    The GMailMessage under inspection
 */
function MatchFilters(MAP, Thread, Email) {
  rulesMatched=0;
  loopsMatched=0;
  try {
    for (i=0; i<MAP.length; i++) {
      loopsMatched=0;
      rule=MAP[i];
      if (rule.Label == null) {
        continue;//skip rules without labels
      }

      header = Email.getHeader(rule.Header);
      if (header == null) {
        continue;//header not found
      }

      valueList = rule.Values;
      if (valueList == null) {
        continue;//value list not found (or is incorrect)
      }
      //Logger.log(i+" Header:"+rule.Header);

      for (j=0; j<valueList.length; j++) {
        //Logger.log(i+"."+j+" Header Value:"+valueList[j]);
        if (header.indexOf(valueList[j]) > -1 ) {
          //Logger.log("Header:"+header+" matched to "+valueList[j]);
          loopsMatched++;
        }
      }//end of j-loop

      //Logger.log("loopsMatched:"+loopsMatched);
      //Logger.log("valuesLength:"+valueList.length);
      if (rule.And) {
        if (loopsMatched == valueList.length) {
          moveForward=true;
        } else {
          continue;
        }
      } else { //implied OR operator
        if (loopsMatched > 0) {
          var moveForward=true;
        } else {
          continue;
        }
      }
      
      if (moveForward) {
        Thread.addLabel(_getLabel(rule.Label));
        if (rule.Archive) { 
          Thread.moveToArchive();
        }
        if (rule.Important) {
          Thread.markImportant();
        }
        if (rule.MarkRead) {
          Thread.markRead();
        }
        if (rule.Delete) {
          Thread.moveToTrash();
        }
        if (rule.Star) {
          Email.star();
        }
        if (SHOULD_APPLY_RETENTION) {
          if (rule.Retention != null) {
            Thread.addLabel(_getLabel(RETENTION_PARENT_LABEL+rule.Retention));
          }
          if (rule.Retention == "0") {
            Thread._removeRetentionLabels();
          }
        }
        rulesMatched++;

      }
    }//end of i-loop

    if (rulesMatched > 0) {
      return true;
    } else { //no rules matched
      return false;
    }
  
  } catch (e) {
    console.error("MatchStandardFilters", e);
    console.error("subject: "+Email.getSubject());
    Thread.addLabel(PrX);
    return false;
  }

  /**
     * IDEAL WORLD
     * pass every Email through a list of filters using intelligent dynamic criteria maps
     * TODO: research how to list the field names in an array map to dynamically iterate them
     */
}
/**
 * Automagically creates and assigns the appropriate label for a mailing list
 * @param {GMailThread} Thread  GMailThread the message resides in
 * @param {GMailMessage} Email  GMailMessage object
 */
function MatchMailingLists(Thread, Email) {
  try {
    if (Email.getHeader("List-Id") != "") {
      // creating the labels when needed
      var header=Email.getHeader("List-Id");
      if (header == "null") {//yes in quotes, it's text
        //found an email that puked the filter because of this
        destination=MAILING_LIST_PARENT_LABEL+"?"
      } else {
        // strip away the mailing list identity
        var start=header.indexOf("<");
        var end=header.indexOf(">",start);
        var list=header.substr(start+1, end-start-1);
        
        internal=list.indexOf(".redhat.com");
        if (internal > -1) {
          list=list.substr(0,internal);
        }
        while (list.indexOf("-") > -1) {
          list=list.replace("-","_");
          //not entirely sure why this x.replace comand doesn't replace all occurances, docs say it should
        }
        var destination=MAILING_LIST_PARENT_LABEL + list
      }

      listLabel=_getLabel(destination);
      Thread.addLabel(listLabel);

      Thread.addLabel(_getLabel(MAILING_LIST_PARENT_LABEL.slice(0, (MAILING_LIST_PARENT_LABEL.length-1))));
      if (SHOULD_APPLY_RETENTION) {
        Thread.addLabel(_getLabel(MAILING_LIST_RETENTION_LABEL));
      }
      if (SHOULD_ARCHIVE_MAILING_LISTS) {
        Thread.moveToArchive();
      }
      return true;
    } else {
      return false;
    }
  } catch (e) {
    console.error("MatchMailingLists exception", e);
    console.error("subject: "+Email.getSubject());
    Thread.addLabel(PrX);
    return false;
  }
}




/**
 * Finds Automated Emails from known sources
 * TODO: abstract this to a map-powered function
 * @param {GMailThread} Thread 
 * @param {GMailMessage} Email 
 */
function MatchAutomatedEmails(MAP, Thread, Email) {
  //does one email against the map  
  try {
    emailRecipients=Email.getHeader("To")+" "+
        Email.getHeader("From")+" "+
        Email.getHeader("Sender");

    //console.log(emailRecipients);
    rulesMatched=0;
    for (i=0; i<MAP.length; i++) {
      loopsMatched=0;
      rule=MAP[i]; //object

      //console.log(MAP.length+" MAP.length");
      //console.log(i+" rule.Label:"+rule.Label);

      try {
        if (rule.Label != null) {
          //console.log( emailRecipients.indexOf(rule.Recipient) );
          if ( emailRecipients.indexOf(rule.Recipient) > -1) {
            //console.log(rule.Recipient);
            loopsMatched++;
          }
        } else {
          continue;
        }
      } catch (e) {
        console.error("MatchAutomatedEmails exception rule check", e);
        console.error("subject: "+Email.getSubject());
        console.error("Label: "+rule.Label+", Recipient: "+rule.Recipient);
        Thread.addLabel(PrX);
        return false;
      }

      try {
        if (loopsMatched > 0) {
          Thread.addLabel(_getLabel(rule.Label));
          if ( rule.Archive == true ) {
            Thread.moveToArchive();
          }
          if (SHOULD_APPLY_RETENTION) {
            if (rule.Retention != null) {
              Thread.addLabel(_getLabel(RETENTION_PARENT_LABEL+rule.Retention));
            } else {
              Thread.addLabel(_getLabel(DEFAULT_AUTOMATED_RETENTION_LABEL));
            }
          }
          rulesMatched++;
        }
      } catch (e) {
        console.error("MatchAutomatedEmails exception apply label", e);
        console.error("subject: "+Email.getSubject());
        Thread.addLabel(PrX);
        return false;
      }
    }//loop end

    //prepare the return for the main thread
    //check for the generic auto reply headers as well
    if ((Email.getHeader("X-Autoreply") == "yes") || (Email.getHeader("Auto-Submitted") == "auto-replied")) {
      Thread.addLabel(_getLabel(AUTOMATED_PARENT_LABEL+"autoreply"));
      if (SHOULD_APPLY_RETENTION) {
        Thread.addLabel(_getLabel(DEFAULT_AUTOMATED_RETENTION_LABEL));
      }
      Thread.moveToArchive();
      rulesMatched++;
    }//*/
  } catch (e) {
    console.error("MatchAutomatedEmails exception outer",e);
    console.error("subject: "+Email.getSubject());
    Thread.addLabel(PrX);
    return false;
  }

  if (rulesMatched > 0) {
    return true;
  } else {
    return false;
  }
}



/**
 * Renames hard-to-understand or meaningless tags
 * @param {Object}  MAP
 * @param {GMailThread} Thread 
 * @param {GMailMessage} Email 
 */
function RenameTags(MAP, Thread, Email) {
  rulesMatched = 0;
  try {
    labelList = Thread.getLabels();
    // get a list of labels the thread has
    if (labelList.length > 0) {
      for (i=0; i<labelList.length; i++)
      {
        label = labelList[i];
        //iterate through hem one at a time
        for (j=0; j<MAP.length; j++) {
          //check each message against the rules in the map
          rule=MAP[j];
          loopsMatched=0;
          if (rule.OldLabel == label.getName()) {
            if (rule.NewLabel != null) {
              console.log("renaming "+rule.OldLabel+" to "+rule.NewLabel)
              Thread.removeLabel(label);
              Thread.addLabel(_getLabel(rule.NewLabel));
              rulesMatched++;
            }//set new rule
            //don't want the old one hanging around for no reason
            if (!SHOULD_PRUNE_LABELS) {
              //unless prune labels will get them tonight
              oldLabelThreadsFound = label.getThreads();
              if (oldLabelThreadsFound == 0) {
                console.log("erasing empty label "+label.getName());
                //it's a good day to die
                label.deleteLabel();
                continue;
              }
            }
            continue;
          }//matched rule
        }//iterate 
      }//iterate thread
    }//labels > 0
  } catch (e) {
    console.error("RenameTags exception",e);
    console.error("subject: "+Email.getSubject());
    Thread.addLabel(PrX);
    return false;
  }
}