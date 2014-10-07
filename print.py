import random
import requests
import string
import time

url = 'https://print.ads.carleton.edu:9192'

headers = {
    'Host': 'print.ads.carleton.edu:9192',
    'Connection': 'keep-alive',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.131 Safari/537.36',
    'Accept-Encoding': 'gzip,deflate,sdch',
    'Accept-Language': 'en-US,en;q=0.8'
}

# headers2 = {
#     'Host': 'print.ads.carleton.edu:9192',
#     'Connection': 'keep-alive',
#     'Content-Length': '284',
#     'Cache-Control': 'max-age=0',
#     'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
#     'Origin': 'https://print.ads.carleton.edu:9192',
#     'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.131 Safari/537.36',
#     'Content-Type': 'application/x-www-form-urlencoded',
#     'Referer': 'https://print.ads.carleton.edu:9192/app',
#     'Accept-Encoding': 'gzip,deflate,sdch',
#     'Accept-Language': 'en-US,en;q=0.8'
# }

def login_payload(username, password):
    return {
        'service': 'direct/1/Home/$Form$0',
        'sp': 'S0',
        'Form0': '$Hidden$0,$Hidden$1,inputUsername,inputPassword,$PropertySelection,$Submit$0',
        '$Hidden$0': 'true',
        '$Hidden$1': 'X',
        'inputUsername': username,
        'inputPassword': password,
        '$PropertySelection': 'en',
        '$Submit$0': 'Log in'
    }

web_print_payload = {
    'service': 'page/UserWebPrint'
}

select_printer_payload = {
    'service': 'direct/1/UserWebPrintSelectPrinter/$Form',
    'sp': 'S0',
    'Form0': '$Hidden,$Hidden$0,$TextField,$Submit,$RadioGroup,$Submit$0,$Submit$1',
    '$Hidden': '',
    '$Hidden$0': '',
    '$TextField': '',
    '$RadioGroup': '3',
    '$Submit$1': '2. Print Options and Account Selection »'
}

print_options_payload = {
    'service': 'direct/1/UserWebPrintOptionsAndAccountSelection/$Form',
    'sp': 'S0',
    'Form0': 'copies,$RadioGroup,$TextField$0,$Submit,$Submit$0',
    'copies': '1',
    '$RadioGroup': '0',
    '$Submit': '3. Upload Documents »'
}

upload_file_payload = {
    'service': 'direct/1/UserWebPrintUpload/$Form$0',
    'sp': 'S1',
    'Form1': ''
}

# def headers_3(id):
#     return {
#         'Host': 'print.ads.carleton.edu:9192',
#         'Connection': 'keep-alive',
#         'Content-Length': '285',
#         'Cache-Control': 'max-age=0',
#         'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
#         'Origin': 'https://print.ads.carleton.edu:9192',
#         'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.131 Safari/537.36',
#         'Content-Type': 'application/x-www-form-urlencoded',
#         'Referer': 'https://print.ads.carleton.edu:9192/app?service=action/1/UserWebPrint/0/$ActionLink',
#         'Accept-Encoding': 'gzip,deflate,sdch',
#         'Accept-Language': 'en-US,en;q=0.8',
#         'Cookie': 'org.apache.tapestry.locale=en; JSESSIONID=%s' % id
#     }

# def id_from_cookie_jar(cj):
#     requests.utils.dict_from_cookiejar(cj)['JSESSIONID']

s = requests.Session()
s.headers = headers

# 0. Begin session by accessing login page.
r = s.get(url + '/app')

# 1. Log in with credentials.
r = s.post(url + '/app', data=login_payload('schillek', ''))

# 2. User web print page.
r = s.get(url + '/app?service=page/UserWebPrint', data=web_print_payload)

# 3. Submit job.
r = s.get(url + '/app?service=action/1/UserWebPrint/0/$ActionLink')

# 4. Submit printer selection.
r = s.post(url + '/app', data=select_printer_payload)

# 6. Submit print options and account selection.
r = s.post(url + '/app', data=print_options_payload)

uploadUID = int([line for line in r.text.split('\n') if 'var uploadUID' in line][0].split('\'')[1])

filename = 'Qinghuaci.pdf'
f = open(filename)

# 7. 
r = s.post(url + '/upload/%i' % uploadUID, files={'file[]': f})

# 8. Submit file upload.
r = s.post(url + '/app', data=upload_file_payload)

# 9. Release the first job on the job release page for printing.

releaseURLs = []
while not releaseURLs:
    r = s.get(url + '/app?service=page/UserReleaseJobs')
    releaseURLs = [line for line in r.text.split('\n') if 'UserReleaseJobs/$ReleaseStationJobs.release' in line]
    time.sleep(0.5)

releaseURL = releaseURLs[0].split()
releaseURL = [x for x in releaseURL if 'href' in x][0][6:-1].replace('&amp;', '&')
r = s.get(url + releaseURL)
