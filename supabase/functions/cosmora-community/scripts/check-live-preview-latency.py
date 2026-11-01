import urllib.request,json,time,statistics,concurrent.futures,hashlib,urllib.parse,urllib.error
base='https://pwdpwgonvnuwmgfiidut.supabase.co/functions/v1/cosmora-community'
root='outputs/community-photo-optimization/current'
manifest={x['original_path']:x for x in json.load(open(root+'/manifest-private.json'))}
t=time.monotonic();f=json.load(urllib.request.urlopen(base+'/api/community/posts',timeout=30));feed_time=time.monotonic()-t
photos=[m for p in f['posts'] for m in p['media'] if m['type']=='IMAGE']
def measure(m):
 t=time.monotonic()
 with urllib.request.urlopen(m['thumbnail_url'],timeout=25) as r:
  assert r.headers.get_content_type()=='image/jpeg';data=r.read()
 elapsed=time.monotonic()-t
 path=urllib.parse.unquote(urllib.parse.urlsplit(m['url']).path).split('/community-media/',1)[1];entry=manifest[path]
 expected=open(root+'/compact/'+entry['thumbnail_file'][:-4]+'.jpeg68.jpg','rb').read();assert hashlib.sha256(data).digest()==hashlib.sha256(expected).digest()
 return round(elapsed,3)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:out=list(pool.map(measure,photos))
for path,expected in [('/api/community/thumbnail?id=invalid',404),('/api/account',401),('/api/seller/profile',401),('/api/community/posts?saved=1',401)]:
 try:urllib.request.urlopen(base+path,timeout=15);status=200
 except urllib.error.HTTPError as e:status=e.code
 assert status==expected
result={'feed_seconds':round(feed_time,3),'preview_seconds':out,'median_seconds':round(statistics.median(out),3),'matching_previews':len(out),'privacy_status_checks':'pass','physical_device_verified':False}
open('outputs/preview-latency-after.json','w').write(json.dumps(result,indent=2));print(json.dumps(result))
