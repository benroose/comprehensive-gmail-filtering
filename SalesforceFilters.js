/**
 * Iterates through all the Salesforce filters and applies rules
 * @param {Object} MAP    Object map of the rules to match
 * @param {GmailThread} Thread    The GMailThread the message belongs to
 * @param {GmailMessage} Email    The GMailMessage under inspection
 */
function MatchSalesforceFilters(MAP, Thread, Email) {
  var rulesMatched=0;
  var loopsMatched=0;
  try {
    var xSender=Email.getHeader("X-Sender");
    if (xSender == SFDC_POSTMASTER) {
      rulesMatched=0;

      for (var i=0; i<MAP.length; i++) {
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

        for (j=0;j<valueList.length;j++) {
          if (header == valueList[j]) {
            loopsMatched++;
          }
        }//end of j-loop
        
        if (loopsMatched > 0) {
          Thread.addLabel(_getLabel(rule.Label));
          if (rule.Archive) { 
            Thread.moveToArchive();
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
          if (rule.Important) {
            Thread.markImportant();
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

      if (SHOULD_LABEL_CASE_NUMBERS) {
        caseNumber = Email.getHeader(SFDC_CASE_NUMBER_HEADER);
        if (caseNumber.length > 0) {
          caseLabel = CASE_NUMBER_PARENT_LABEL+caseNumber;
          Thread.addLabel(_getLabel(caseLabel));
        }
      }
      

      if (rulesMatched > 0) {
        return true;
      } else { //no rules matched
        return false;
      }
    
    } else {
      //not a salesforce message
      return false;
    } //bottom of Salesforce messages
  } catch (e) {
    console.error("MatchSalesforceFilters exception", e);
    console.error("subject: "+Email.getSubject());
    Thread.addLabel(PrX);
    return false;
  }
}
