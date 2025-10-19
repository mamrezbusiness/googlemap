(function(){
  const CFG = window.__BP_WAA_CFG__ || {};
  const API_KEY = CFG.apiKey || '';
  const LIMIT_TO_COUNTRY = Array.isArray(CFG.countries) ? CFG.countries : [];
  const CTA_LABEL = CFG.ctaLabel || 'Get my location';
  const POPUP_TITLE = CFG.popupTitle || 'Search your address';

  const raf = ()=>new Promise(r=>requestAnimationFrame(r));
  const sleep = (ms)=>new Promise(r=>setTimeout(r, ms));

  function svgPin(){
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" stroke="currentColor" stroke-width="1.5"></path><circle cx="12" cy="10" r="2.8" stroke="currentColor" stroke-width="1.5"></circle></svg>';
  }

  function pick(pj, type){
    const c = (pj.addressComponents||[]).find(x => (x.types||[]).includes(type));
    return c ? { short:c.shortText||'', long:c.longText||'' } : { short:'', long:'' };
  }
  function parsePlace(pj){
    const sn = pick(pj,'street_number').short || pick(pj,'street_number').long;
    const rt = pick(pj,'route').long || pick(pj,'route').short;
    const address_1 = [sn, rt].filter(Boolean).join(' ').trim();

    const city = (
      pick(pj,'locality').long ||
      pick(pj,'postal_town').long ||
      pick(pj,'sublocality').long ||
      pick(pj,'administrative_area_level_3').long ||
      pick(pj,'administrative_area_level_2').long || ''
    );

    const state    = pick(pj,'administrative_area_level_1').short || pick(pj,'administrative_area_level_1').long;
    const postcode = (pick(pj,'postal_code').short || pick(pj,'postal_code').long || '').toUpperCase();
    const country  = pick(pj,'country').short || pick(pj,'country').long;

    return { address_1, city, state, postcode, country };
  }

  async function waitForStores(){
    for (let i=0;i<200;i++){
      if (window.wp && wp.data && wp.data.select) {
        const dCart = wp.data.dispatch && wp.data.dispatch('wc/store/cart');
        if (dCart && typeof dCart.setShippingAddress === 'function') return true;
      }
      await sleep(50);
    }
    return false;
  }

  async function setAddress(addr, target){
    // Classic fallback
    if (!(window.wp && wp.data && wp.data.select)) {
      const prefix = (target === 'billing') ? 'billing' : 'shipping';
      const s1 = document.getElementById(prefix+'-address_1') || document.querySelector(`input[name="${prefix}_address_1"]`);
      const sc = document.getElementById(prefix+'-city')      || document.querySelector(`input[name="${prefix}_city"]`);
      const sp = document.getElementById(prefix+'-postcode')  || document.querySelector(`input[name="${prefix}_postcode"]`);
      const ss = document.getElementById(prefix+'-state')     || document.querySelector(`select[name="${prefix}_state"],input[name="${prefix}_state"]`);
      const scn= document.getElementById(prefix+'-country')   || document.querySelector(`select[name="${prefix}_country"],input[name="${prefix}_country"]`);
      if (s1) s1.value = addr.address_1 || '';
      if (sc) sc.value = addr.city || '';
      if (sp) sp.value = addr.postcode || '';
      if (ss) ss.value = addr.state || '';
      if (scn) scn.value = addr.country || '';
      [s1, sc, sp, ss, scn].forEach(el=>{ try{ el && el.dispatchEvent(new Event('change',{bubbles:true})); }catch(e){} });
      return;
    }

    const cart = wp.data.dispatch('wc/store/cart');

    if (target === 'billing') {
      await cart.setBillingAddress({ country: addr.country });
      await raf(); await sleep(30);
      await cart.setBillingAddress(addr);
    } else {
      await cart.setShippingAddress({ country: addr.country });
      await raf(); await sleep(30);
      await cart.setShippingAddress(addr);
    }
  }

  function isMapsReady(){
    return !!(window.google && google.maps && google.maps.places && google.maps.places.PlaceAutocompleteElement);
  }
  function loadMaps(){
    return new Promise((resolve)=>{
      if (isMapsReady()) return resolve(true);
      if (document.getElementById('gmaps-places-loader')){
        const t = setInterval(()=>{ if (isMapsReady()){ clearInterval(t); resolve(true); } }, 200);
        return;
      }
      const s = document.createElement('script');
      s.id='gmaps-places-loader';
      const qs = new URLSearchParams({ key: API_KEY, v: 'weekly', libraries: 'places', loading: 'async', callback: '__bpGInit' });
      s.src = 'https://maps.googleapis.com/maps/api/js?' + qs.toString();
      s.defer = true;
      window.__bpGInit = () => resolve(true);
      document.head.appendChild(s);
    });
  }

  function ensureModal(){
    let overlay = document.querySelector('.bp-addr-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'bp-addr-overlay';
    overlay.innerHTML = `
      <div class="bp-addr-dialog" role="dialog" aria-modal="true" aria-labelledby="bpAddrTitle">
        <div class="bp-addr-header">
          <div id="bpAddrTitle" class="bp-addr-title">${POPUP_TITLE}</div>
          <button type="button" class="bp-addr-close" aria-label="Close">✕</button>
        </div>
        <div class="bp-addr-body"><div class="bp-addr-autowrap"></div></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e)=>{ if (e.target === overlay) closeModal(); });
    overlay.querySelector('.bp-addr-close').addEventListener('click', closeModal);
    window.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeModal(); });
    return overlay;
  }
  function openModal(target){
    const overlay = ensureModal();
    overlay.style.display = 'flex';
    const mountEl = async ()=>{
      const wrap = overlay.querySelector('.bp-addr-autowrap');
      wrap.innerHTML = '';

      const el = new google.maps.places.PlaceAutocompleteElement({ includedRegionCodes: LIMIT_TO_COUNTRY });
      el.className = 'bp-gmaps-autocomplete';
      el.setAttribute('placeholder','Start typing your address...');

      el.addEventListener('gmp-select', async ({ placePrediction }) => {
        try{
          await waitForStores();
          const place = placePrediction.toPlace();
          await place.fetchFields({ fields: ['addressComponents'] });
          const data = parsePlace(place.toJSON());
          if (LIMIT_TO_COUNTRY.length && !LIMIT_TO_COUNTRY.includes((data.country||'').toLowerCase())) return;
          await setAddress(data, target);
          closeModal();
        }catch(err){ console.error('autocomplete->store error', err); }
      });

      wrap.appendChild(el);

      setTimeout(()=> el.shadowRoot?.querySelector('input')?.focus(), 20);
    };
    if (isMapsReady()) mountEl(); else loadMaps().then(mountEl);
  }
  function closeModal(){
    const overlay = document.querySelector('.bp-addr-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  function injectButtons(){
    const lookup = [
      ['shipping', '#shipping-address_1, input[name="shipping_address_1"]'],
      ['billing',  '#billing-address_1, input[name="billing_address_1"]']
    ];

    lookup.forEach(([target, selector])=>{
      const anchors = document.querySelectorAll(selector);
      anchors.forEach(anchor=>{
        if (!anchor || anchor.__bpTools) return;

        const tools = document.createElement('div');
        tools.className = 'bp-addr-inline-tools';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bp-addr-trigger';
        btn.innerHTML = svgPin() + `<span>${CTA_LABEL}</span>`;
        btn.addEventListener('click', ()=> openModal(target));

        tools.appendChild(btn);

        if (anchor.parentNode) {
          anchor.parentNode.insertBefore(tools, anchor.nextSibling);
        } else {
          anchor.insertAdjacentElement('afterend', tools);
        }

        anchor.__bpTools = tools;
      });
    });
  }

  function keepAlive(){
    const mo = new MutationObserver(()=>{
      injectButtons();
    });
    mo.observe(document.documentElement, {childList:true, subtree:true});
  }

  (async function boot(){
    for (let i=0;i<200;i++){
      if (document.querySelector('.wc-block-components-address-form, form.checkout')) break;
      await raf();
    }
    injectButtons();
    keepAlive();
    if (API_KEY) loadMaps();
  })();
})();
