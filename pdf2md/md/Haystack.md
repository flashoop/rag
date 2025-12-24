# Haystack

*Converted from: Haystack.pdf*

---

# Haystack
## **20 [th] October 2019 / Document No D19.100.45**

**Prepared By: MinatoTW**

**Machine Author: Joydragon**

**Difficulty: Easy**

**Classification: Official**


Page 1 / 16


## **SYNOPSIS**

Haystack is an Easy difficulty Linux box running the ELK stack ( Elasticsearch, Logstash and

Kibana). The elasticsearch DB is found to contain many entries, among which are base64

encoded credentials, which can be used for SSH. The kibana server running on localhost is found

vulnerable to file inclusion, leading to code execution. The kibana user has access to the

Logstash configuration which is set to execute files as root based on a certain filter.


## **Skills Required**


  - Enumeration


## **Skills Learned**


  - Elasticsearch enumeration

  - Kibana File inclusion

  - Logstash plugins and filters



Page 2 / 16


## **Enumeration** **Nmap**





We find SSH open on port 22 along with Nginx servers on port 80 and 9200. Browsing to port 80

we just find an image of a needle.


Page 3 / 16


## **ElasticSearch**

A quick google search reveals that port 9200 is the default port for Elasticsearch. Navigating to

port 9200 in the browser we receive a JSON response with the cluster name as “elasticsearch”.

This hints that the server is indeed running elasticsearch. Data in Elasticsearch is stored in the

form of “indices”. It is similar to a database in any Relational DBMS server. To list all indexes

present in the DB the _cat API can be used.





As seen above, there are three indexes, quotes, bank and .kibana (default). The _search API can

be used to list the entries present in a DB. For example, to list entries in the quotes DB.





Page 4 / 16


By default, the _search API returns just 10 entries. To find out the number of entries present use

the _count API.


We see that there are 253 entries in the quotes index. The size parameter can be used to specify

the number of entries to return.





We can see that the total number of hits returned are 253. To display all the entries we can use

curl. The output would contain JSON data with the quotes, in order to extract only the quotes

we’ll format our output using jq.


Page 5 / 16


Let’s extract the quote from the first entry using jq.


As we can see, the “quote” field is nested within the “hits” array which is in turn nested within the

“hits” object. In order to select a field with jq the “.name” notation can be used.


The command below would extract the “hits” field out of the output above.





Page 6 / 16


Similarly, to extract the next hits array we can issue:


To specify an array the “[]” filter should be used. This will return all elements in the array.


Page 7 / 16


## **Foothold**

The quote is present in the “_source” field. We can now use “._source.quote” filter to access it

directly.


We were able to extract the quote string using the jq filters. Now the size can be set to 253 and

all quotes can be displayed.





All the quotes present in the output are in Spanish. Manually looking through them we’ll find
these two uncommon sentences.





They contain two base64 encoded strings which decode to:



Page 8 / 16


It says the username is security and the password is “spanish.is.key”. Trying to login with the
credentials found above lets us in.


Page 9 / 16


## **Lateral Movement**

Looking at the ports open on localhost we find port 5601 to be open.


The command “ss” is used as netstat isn’t available. The -4 flag is used to specify IPv4, the -l flag

shows only listening ports and the -n flag is used to display port numbers. This shows that a

service is listening on port 5601, which is used by Kibana. This port can be forwarded using SSH.





The command above forwards all connections from 5601 on our box to port 5601 on haystack.
Browsing to port 5601 using the browser shows that it does indeed host a Kibana server.


Page 10 / 16


​ ​


​



Kibana is a data visualization UI used with Elasticsearch. It helps in displaying the data from

Elasticsearch in the form of graphs, charts, etc. To find the version, the /api/status API can be

called.


The version number of the Kibana server is found to be “6.4.2”.


Searching about vulnerabilities in this version we come across [CVE-2018-17246​](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2018-17246) .​ There’s a file

inclusion vulnerability in kibana versions before 6.4.3. A write-up on the exploitation can be found

[here. According to it, the /api/console/api_server endpoint is vulnerable to LFI. ​](https://www.cyberark.com/threat-research-blog/execute-this-i-know-you-have-it/)


First, we need to create a .js file containing a node reverse shell such that it gets executed on

inclusion. Create a file at /tmp/shell.js with the contents:



​ ​


​



​ ​


​



​ ​


​



​ ​


​



​ ​


​


Page 11 / 16


Then start a listener on port 1234 and use curl to execute the shell.





We received a shell as the user “kibana”.



Page 12 / 16


## **Privilege Escalation**

Let’s enumerate the files and folders we have access to as the kibana user.


First we spawn a tty using python and then use the find command to list all files owned by kibana

excluding the files in /usr and /proc. At the end of the output we see a folder “/opt/kibana”. Going

into the folder we find that it’s empty. Now, let’s find the files our group has access to.


We have access to the /etc/logstash/conf.d folder as the user kibana. Logstash is a software

which collects data from various sources and sends it to Elasticsearch for storage. It can collect

data from various logs and services such as databases, system logs, etc.


Looking into the folder, we find three files i.e filter.conf, input.conf and output.conf. Here are the

contents of the input.conf file:


Page 13 / 16


​ ​


​ ​



​ ​


​ ​



​ ​


​ ​



Looking at the logstash configuration documentation [here​](https://www.elastic.co/guide/en/logstash/current/configuration-file-structure.html),​ The input section is used to specify

the source to read the data from. In the configuration above, the file path is configured to be

/opt/kibana/logstash_* and the interval is set to 10 seconds. This means that Logstash would read

any files which have names starting with logstash_* every 10 seconds. Next, let’s view the

filter.conf file.


​ ​



​ ​


​ ​



​ ​


​ ​



​ ​


The filter.conf stores the configuration for the filter plugin. Logstash uses the grok filter to match

[and filter out data. The grok documentation can be found here​](https://www.elastic.co/guide/en/logstash/current/plugins-filters-grok.html) . It uses regular expressions along ​

with it’s own syntax to identify input.


The filter in the configuration file above is:



​ ​


​ ​



​ ​


​ ​



​ ​


​ ​


The \s regular expression is used to denote a space. The asterisk after \s means that there can


Page 14 / 16


​



be zero or more spaces in the input. The plus symbol after \s means that there can be one or

more spaces. The %{GREEDYDATA:comando} is a grok filter which will select all the data present

after the spaces and assign it to a variable named “comando”. For example, if our input is:


​



​



​



Grok will assign the string “HTB rocks!” to comando, which will be sent to the output filter. Here’s

the output.conf file:


​



​



​



It uses the “exec” plugin to execute the command specified by the “comando” variable. So,

logstash will try executing “HTB rocks!”. This can be set to any command which will get executed

within 10 seconds. Let’s try running whoami to see which user we’re running as. Use the following

command to create an input file.


​



​



​



The command above will create a file /opt/kibana/logstash_execute, which on execution writes

the output of the command **whoami** ​ to /tmp/user. Checking after a few seconds, we see that

we’re running as root.


Page 15 / 16


We can now try writing a shell and get it executed.





The input above would result in execution of a bash reverse shell to port 4444.



Page 16 / 16


