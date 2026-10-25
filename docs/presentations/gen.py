import json,os,sys
from PIL import Image
S=sys.argv[1]
B='/_blob/'
D={
'uppgifter':dict(title='ByggExp – Uppgifter',h1='Uppgifter med påminnelser',sub='Inget glöms bort på bygget.',ids=['602daebc27d52ed6f1ed28c0afaf4a32','a22320b977170fab6312a0da8bc455da','e71cca9e14b5de66448ee01e771aab23','924e45466449ef58855cca2765052166'],
 steps=[('Skapa uppgift',['Adminpanelen','Uppgifter'],'Klicka Lägg till uppgift och skriv vad som ska göras.'),('Välj mottagare',['Adminpanelen','Uppgifter'],'En person eller hela projektteamet.'),('Sätt påminnelse',['Adminpanelen','Uppgifter'],'Appen påminner tills uppgiften är klar och säger till chefen vid behov.')],
 shot=('Steg 1',['Adminpanelen','Produktion','Uppgifter'],'Skapa uppgift','Påminnelse var 15:e minut efter deadline. Efter 3 påminnelser får chefen besked.'),cover=0),
'live':dict(title='ByggExp – Live-översikt',h1='Live-översikt',sub='Se vem som jobbar – just nu.',ids=['ac03c1d5b534876095a649ebd9168769','1c3f62c70dbd894519e1e1817af68215','0153547fcb6a4d254acc3ff86d8f46e4','f60017a4b074852f3472c681a8022c56'],
 steps=[('Öppna Översikt',['Adminpanelen','Översikt'],'Allt syns direkt när du loggar in.'),('Vem jobbar var',['Översikt','Personalöversikt'],'Status, timmar idag och projekt för varje person.'),('Frånvaro direkt',['Översikt','Personalöversikt'],'Den som inte har startat sitt pass syns i rött.')],
 shot=('Steg 2',['Adminpanelen','Översikt'],'Personalöversikt i realtid','Grönt = på jobbet, rött = inte på jobbet. Klicka på en person för att se dagen.'),cover=1),
'foto':dict(title='ByggExp – Fotodokumentation',h1='Fotodokumentation',sub='Bilderna sparas med rätt dag och projekt.',ids=['171c7ed570dbca30ea81acd4f91853e3','25d83abcc5067e653f04651070ceaf12','70747cdf5686be1340eb96217b590801','a03ca549b8974fd05930a6d2ed869535'],
 steps=[('Fota i appen',['Appen','Arbetspass','Manuell'],'Arbetaren fotar arbetet direkt i appen.'),('Kopplas till passet',['Appen','Arbetspass'],'Bilden sparas på rätt dag och projekt automatiskt.'),('Hela historiken',['Adminpanelen','Arbetspass','Passlogg'],'Alla bilder per dag, person och projekt.')],
 shot=('Steg 1',['Appen','Arbetspass','Manuell'],'Foton och kvitton i dagens pass','Fota arbetet eller kvittot – det hamnar på rätt dag direkt.'),cover=0,phone=True),
'planering':dict(title='ByggExp – Planering och bemanning',h1='Projekt- och personalplanering',sub='Rätt person på rätt bygge varje dag.',ids=['22ef68d737a8b5db2c63aec8331d6189','9740a7e07fe0847222c42108087ba354','40c6eecd4baf87c24eba4a6f0135e7b2','a5b9b67d4cdfe9be7118008fc88950b8'],
 steps=[('Planera projektet',['Adminpanelen','Projekt'],'Skapa projektet med start- och slutdatum.'),('Tilldela personal',['Adminpanelen','Bemanning'],'Klicka i en ruta för att sätta någon på ett projekt.'),('Full koll',['Adminpanelen','Bemanning'],'Vecka för vecka ser du vem som är var. Frånvaro syns direkt.')],
 shot=('Steg 2',['Adminpanelen','Produktion','Bemanning'],'Bemanning vecka för vecka','En rad per person, en färg per projekt.'),cover=1),
'verktyg':dict(title='ByggExp – Verktyg',h1='Verktyg och utrustning',sub='Vet alltid vem som har vad.',ids=['fad3ff834305179e9614780a8cffdf0f','7ea417b56662999ebc1158c6d03277ea','02bb1f4493ea5f632e79a9d624af3c45','1ed3be61180d0222108a9ea5af6e0ec8'],
 steps=[('Lägg till verktyg',['Adminpanelen','Verktyg'],'Skriv ut QR-koden och sätt den på verktyget.'),('Skanna QR-koden',['Appen','Skanna'],'Arbetaren skannar och tar verktyget till sitt projekt.'),('Följ ansvaret',['Adminpanelen','Verktyg'],'Status, vem som har det och på vilket projekt.')],
 shot=('Steg 3',['Adminpanelen','Produktion','Verktyg'],'Alla verktyg på ett ställe','Tillgänglig, upptagen, på reparation eller trasig – och vem som har det.'),cover=0),
'offerter':dict(title='ByggExp – Offerter',h1='Offerter',sub='Från förfrågan till ja – på några minuter.',ids=['4aee8d807eef5a976b0a3a31561b140f','e7323b1f54672e94f38bb133e67f599b','3b1b4ce6f377b3234ca9a1be9841a429','099c4902402c99b9421500a9a7e9e08b'],
 steps=[('Skriv offerten',['Adminpanelen','Offerter'],'Rader med antal, enhet och á-pris. Moms räknas automatiskt.'),('Skicka till kunden',['Adminpanelen','Offerter'],'Kunden får offerten via e-post.'),('Kunden säger ja',['Adminpanelen','Offerter'],'Markera offerten som accepterad och starta jobbet.')],
 shot=('Steg 1',['Adminpanelen','Ekonomi','Offerter'],'Offertrader','Summa exkl. moms, moms och totalt räknas medan du skriver.'),cover=0),
'fakturor':dict(title='ByggExp – Fakturor',h1='Fakturor från timmarna',sub='Fakturera det som faktiskt jobbats.',ids=['70396ed090caba7c59676ea4a11e6044','c18df4732afa39513555016824dc17ca','bdbfe3d5507d68c40804b7c327c954ef','5e9c9482e0ef7e8492ade138f7c4e745'],
 steps=[('Välj period',['Adminpanelen','Arbetspass'],'Markera personer och dagar i timtabellen.'),('Förbered utkast',['Arbetspass','Förbered fakturautkast'],'Timmarna följer med till fakturan.'),('Skicka fakturan',['Adminpanelen','Fakturor'],'Skapa & skicka direkt till kunden.')],
 shot=('Steg 1',['Adminpanelen','Tid & personal','Arbetspass'],'Markera timmarna som ska faktureras','Välj personer och dagar – klicka Förbered fakturautkast.'),cover=1),
'ekonomi':dict(title='ByggExp – Projektekonomi',h1='Projektekonomi',sub='Marginalen i realtid, för varje projekt.',ids=['7d85b4786bd08e36d058fdb1536444d8','512aaba1e517a51cb3f6c0f36f2a75af','c29c9e50dcea2cfb9a53908c7b440521','74dc2fc4f6b138b9b5283ed143a19662'],
 steps=[('Sätt budget',['Projekt','Ekonomi'],'Budget och timpriser för projektet.'),('Allt räknas in',['Projekt','Ekonomi'],'Timmar, utlägg och inköp räknas automatiskt.'),('Se marginalen',['Adminpanelen','Lönsamhet'],'Fakturerat minus kostnader, för varje projekt.')],
 shot=('Steg 1',['Adminpanelen','Projekt','Ekonomi'],'Timpriser och kostnader','Ange självkostnad och debiteringspris – marginalen räknas direkt.'),cover=2),
'utlagg':dict(title='ByggExp – Utlägg och kvitton',h1='Utlägg och kvitton',sub='Fota kvittot – resten sköter systemet.',ids=['36d6f8b74332e1f1de85ccee5ce061d7','c53278bca07e2e1cd7da0e0f0a10a326','d8fc1bc4300d0ac8444f2fa9dd7260c9','e5b75abc36fe9f69fa126bf49eba8359'],
 steps=[('Fota kvittot',['Appen','Utlägg'],'Arbetaren fotar kvittot direkt i butiken.'),('Koppla till projekt',['Appen','Utlägg'],'Kvittot hamnar på rätt projekt.'),('Kostnaden syns',['Adminpanelen','Utlägg'],'Leverantör, datum och belopp läses av automatiskt.')],
 shot=('Steg 3',['Adminpanelen','Ekonomi','Utlägg'],'Alla utlägg på ett ställe','Släpp kvitton i rutan – eller låt arbetarna fota dem i appen.'),cover=0),
}
F="font-family:'DM Sans', Arial, sans-serif"
def crumb(parts,size=24):
    out=[]
    for i,p in enumerate(parts):
        st='color:#5B7591' if 0<i<len(parts)-1 else 'font-weight:700'
        out.append(f'<span style="{st}">{p}</span>')
    return '&nbsp;<span style="color:#2394FF">›</span>&nbsp;'.join(out)
for key,d in D.items():
    root=f'{S}/{key}/project'; os.makedirs(f'{root}/slides',exist_ok=True)
    deck={"v":4,"createdOnFiles":{"v":1,"at":"2026-10-25T10:00:00Z"},"lists":"css","title":d['title'],"cover":"cover","order":["cover","flode","steg"],
      "sections":{"s1":{"description":"Översikt","start":"cover"},"s2":{"description":"I adminpanelen","start":"steg"}},
      "faces":{"dm-sans":{"family":"DM Sans","href":"https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400..700&display=swap"}},
      "designSystems":[{"title":"ByggExp Presentationer","namespace":"byggexp","artifact":"https://claude.ai/artifact/HSGBFegMhpGMmbHGRryZzG","version":None,"copiedAt":"2026-10-25T10:00:00Z"}]}
    json.dump(deck,open(f'{root}/deck.json','w'),ensure_ascii=False)
    cid=d['ids'][d['cover']]
    open(f'{root}/slides/cover.html','w').write(f'''<section id="cover" data-transition="fade" style="background:#0A1828;color:#F1F6FB;{F};padding:128px 128px 160px;display:flex;flex-direction:column;justify-content:center;gap:40px">
<div style="position:absolute;left:0;top:0;width:24px;height:1080px;background:#2394FF"></div>
<img src="{B}{cid}" alt="Illustration" style="position:absolute;left:1180px;top:200px;width:620px;height:620px;object-fit:contain;background:#FFFFFF;border-radius:24px">
<p style="font-size:28px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:#2394FF">ByggExp</p>
<h1 style="{F};font-size:96px;font-weight:600;line-height:1.05;color:#F1F6FB;width:960px">{d['h1']}</h1>
<p style="font-size:36px;color:#94A8BC;width:900px">{d['sub']}</p>
<aside>{d['h1']}: kort instruktion i tre steg.</aside>
</section>
''')
    cards=''
    for i,(t,c,e) in enumerate(d['steps']):
        cards+=f'''<div style="display:flex;flex-direction:column;gap:24px;width:507px">
<img src="{B}{d['ids'][i]}" alt="{t}" style="width:507px;height:400px;object-fit:contain;background:#FFFFFF;border-radius:24px">
<div style="display:flex;gap:10px;align-items:baseline"><p style="font-size:32px;font-weight:600;color:#2394FF;line-height:1.15">{i+1}</p><p style="font-size:32px;font-weight:600;line-height:1.15;white-space:nowrap">{t}</p></div>
<p style="font-size:24px;line-height:1.5;margin-top:-8px">{crumb(c)}</p>
<p style="font-size:24px;line-height:1.4;color:#5B7591">{e}</p>
</div>
'''
    open(f'{root}/slides/flode.html','w').write(f'''<section id="flode" data-transition="fade" style="background:#F1F6FB;color:#0A1828;{F};padding:112px 160px 112px;display:flex;flex-direction:column;justify-content:center;gap:56px">
<h2 style="{F};font-size:36px;font-weight:600;line-height:1.1;color:#5B7591">Så går det till</h2>
<div style="display:flex;gap:40px">
{cards}</div>
<aside>{" → ".join(s[0] for s in d['steps'])}.</aside>
</section>
''')
    step,cr,hd,note=d['shot']
    im=Image.open(f'{S}/{key}/img/skarm.png'); w,h=im.size
    if d.get('phone'):
        H=640; W=int(w*H/h)
        img=f'<img src="{B}{d["ids"][3]}" alt="{hd}" style="width:{W}px;height:{H}px;object-fit:contain;align-self:center">'
    else:
        maxw,maxh=1600,600; sc=min(maxw/w,maxh/h); W,H=int(w*sc),int(h*sc)
        img=f'<img src="{B}{d["ids"][3]}" alt="{hd}" style="width:{W}px;height:{H}px;object-fit:contain;background:#FFFFFF;border:1px solid #E1EAF3;border-radius:16px">'
    open(f'{root}/slides/steg.html','w').write(f'''<section id="steg" data-transition="fade" style="background:#F1F6FB;color:#0A1828;{F};padding:112px 160px 112px;display:flex;flex-direction:column;gap:48px">
<div style="display:flex;flex-direction:column;gap:12px">
<p style="font-size:26px;color:#0A1828"><span style="font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#2394FF">{step}&nbsp;·&nbsp;</span>{crumb(cr,26)}</p>
<h2 style="{F};font-size:40px;font-weight:600;line-height:1.1">{hd}</h2>
</div>
{img}
<p style="font-size:28px;color:#5B7591;margin-top:-16px">{note}</p>
<aside>{note}</aside>
</section>
''')
print('ok')
