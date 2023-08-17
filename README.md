# REASONS

Gmail filtering is far too rudimentary (read:stupid) to be useful for a user who gets lots of work-related messages, especially from a Salesforce system. Also...
```
            .-'` `}
    _./)   /       }
  .'o   \ |       }
  '.___.'`.\    {`
  /`\_/  , `.    }
  \=' .-'   _`\  {
   `'`;/      `,  }
      _\       ;  }
     /__`;-...'--'
```

# NOTES

This project works with the updated V8 engine. Please open a bug if you encounter one. Everything this does is optional and nothing is enabled by default.

# FEATURES

This script encompasses everything that I have needed my gmail inbox to do that it is incapable .
It is also a collection of filtering techniques I have learned from others.

## It _CAN_ do the following:

By default none of the features are enabled.

* Classifies Automated messages
  - autoreplies, notifications, non-customer updates
* **Automagically organizes mailing list messages**
  - **including dynamically creating labels for lists you didn't know you were on**
* Tags emails from client domains, and VATs
* Classifies Salesforce emails
  - tags SBRs
  - matches personal and backup account numbers
* Labels salesforce cases with casenumber tags *
* Applies and enforces a dynamic email retention system
  - Removes empty tags from:
    - any defined parent label you choose
* Attempts full error tolerance, applying a special tag to messages that generate exceptions
  - boosts rescheduling time when detecting ratelimit is exceeded
  - *I did my best*
* Renames troublesome tags (like google alerts) to more logial ones.

_* this feature should be used very carefully because without retention and pruning of labels it could generate an ever growing list of case number tags._

# USAGE

Clone this project then Rename MyFilters.template to MyFilters.js

Install it to your GAS. Run the 'Install' function and accept the permissions.

The magic will happen automatically. The Filterbeast will schedule itself to run at intervals. By default the inbox process kicks off every 5 minutes, and the retention process is nightly. Only the features you have enabled will process though.

Additional instructions are found in the [wiki](https://gitlab.cee.redhat.com/phagerma/Filterbeast/-/wikis/home)
