const inputZipCode = document.querySelector('#zipCode');
const inputPublicPlace = document.querySelector('#publicPlace');
const selectState = document.querySelector('#state');
const selectCity = document.querySelector('#city');
const loading = selectCity.previousElementSibling;
const btnSearchByZipCode = document.querySelector('#SearchByZipCode');
const btnSearchByAddress = document.querySelector('#SearchByAddress');
const zipCodePanel = document.querySelector('.zipCodePanel');
const addressPanel = document.querySelector('.addressPanel');
const pagination = document.querySelector('.pagination');

const statesData = [];
const addressData = [];

const errors = {
	input: [],
	message: [],
	add(arrayInputs, arrayMessages) {
		arrayInputs.forEach((input, index) => {
			errors.input.push(input);
			errors.message.push(arrayMessages[index]);
		});
	},
	removeElementError(...elements) {
		const indexes = [];

		errors.input.forEach((input, index) => {
			elements.forEach(element => {
				if(element === input) {
					indexes.push(index);
					errors.clearElement(element);
				}
			});
		});

		const start = indexes.length - 1;

		for(let i = start; i >= 0; i--) {
			errors.input.splice(indexes[i], 1);
			errors.message.splice(indexes[i], 1);
		}
	},
	clearElement(...elements) {
		elements.forEach(element => {
			element.nextElementSibling.innerHTML = '&nbsp;';
		});
	},
	show() {
		errors.input.forEach((input, index) => {
			input.nextElementSibling.innerText = errors.message[index];
		});
	}
};

const check = {
	isEmpty(...inputs) {
		let isEmpty = false;

		inputs.forEach(input => {
			const length = input.value.length;
			const empty = length === 0 ? true : false;
			
			if(empty) {
				errors.add([input], ['* Preencha este campo']);
				isEmpty = true;
			}
		});

		return isEmpty;
	},
	smallerThan(input, min) {
		const length = input.value.length;
		const smallerThan = length < min ? true : false;

		if(smallerThan) {
			errors.add([input], ['* Formato inválido']);
		}

		return smallerThan;
	}
};

const masks = {
	cep(cep) {
		return cep.replace(/\D/g, '')
  		.replace(/(\d{2})(\d)/, '$1.$2')
  		.replace(/(\d{3})(\d)/, '$1-$2')
  		.replace(/(-\d{3})\d+?$/, '$1');
	},
	clearURLchars(chars) {
		return chars.replace(/[^0-9a-z' ']/ig, '');
	}
};

const requisitions = {
  async getStates() {
    const url = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados';
    const response = await fetch(url);
    return await response.json();
  },
  async getCities(id) {
    const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${id}/municipios`;
    const response = await fetch(url);
    return await response.json();
  },
  async getZipCode(zipCode) {
    const url = `https://viacep.com.br/ws/${zipCode}/json/`;
    const response = await fetch(url);
    return response.json();
  },
  async getAddress(uf, city, publicPlace) {
    const url = `https://viacep.com.br/ws/${uf}/${city}/${publicPlace}/json/`;
    const response = await fetch(url);
    return response.json();
  }
};

const load = {
  async states() {
    const states = await requisitions.getStates();
    const stateNames = [];

    states.forEach(state => {
      statesData.push(state);
      stateNames.push(state.nome);
    });

    order(stateNames);
    
    stateNames.forEach(name => {
      const option = `<option>${name}</option>`;
      selectState.innerHTML += option;
    });
  },
  async cities() {
    const stateText = event.target.value;
    const cityNames = [];

    errors.removeElementError(selectCity, selectState);
    
    selectCity.innerHTML = '<option></option>';
    
    if(!stateText) return;

    statesData.forEach(async ({ id, nome }) => {
      if(nome === stateText) {
        loading.classList.add('loading');

        const cities = await requisitions.getCities(id);

        change.panelDisplay(addressPanel.parentNode, false);

        cities.forEach(({ nome }) => cityNames.push(nome) );

        order(cityNames);

        cityNames.forEach(cityName => {
          const option = `<option>${cityName}</option>`;
          selectCity.innerHTML += option;
        });

        loading.classList.remove('loading');
      }
    });
  }
};

const show = {
  pageCounters(quantity) {
    pagination.innerHTML = '';

    for(let i = 1; i <= quantity; i++) {
      const counter = `<p class="index" data-index="${i}">${i}</p>`;

      pagination.innerHTML += counter;
    }

    const pageIndexes = [...pagination.children];

    pageIndexes.forEach(index => {
      index.addEventListener('click', event => change.page(event));
    });

    pagination.firstElementChild.classList.add('selected');
  },
  zipCodeData(data) {
    const { uf, localidade, logradouro, bairro, complemento, cep } = data;

    const panelData = `
      <p class="zip-code"><span>CEP:</span> ${masks.cep(cep)}</p>
      <p><span>UF:</span> ${uf}</p>
      <p><span>Localidade:</span> ${localidade}</p>
      <p><span>Logradouro:</span> ${logradouro}</p>
      <p><span>Bairro:</span> ${bairro}</p>
      <p><span>Complemento:</span> ${complemento}</p>
    `;

    zipCodePanel.innerHTML = panelData;
  },
  addressData(data) {
    addressData = [];

    data.forEach(({cep, logradouro, bairro}) => {
      addressData.push({
        cep: masks.cep(cep),
        logradouro: logradouro,
        bairro: bairro
      });
    });
    
    const nextPageData = calcPageItems(1);

    addressPanel.innerHTML = '';

    panelFill(nextPageData);

    show.pageCounters(nextPageData.quantityPages);
  }
};

const search = {
  async byZipCode() {
    errors.removeElementError(inputZipCode);
    const smallerThan = check.smallerThan(inputZipCode, 10);
    const isEmpty = check.isEmpty(inputZipCode);
    const ok = !isEmpty && !smallerThan ? true : false;
    
    if(!ok) {
      change.panelDisplay(zipCodePanel, false);
      errors.show();
      return;
    };

    const confirmation = await requisitions.getZipCode(inputZipCode.value.replace(/\D/g, ''));

    if(confirmation.erro) {
      change.panelDisplay(zipCodePanel, false);
      errors.add([inputZipCode], ['* CEP inexistente']);
      errors.show();
    } else {
      show.zipCodeData(confirmation);
      change.panelDisplay(zipCodePanel, true);
    }
  },
  byAddress() {
    errors.removeElementError(selectState, selectCity, inputPublicPlace);

    const smallerThan = check.smallerThan(inputPublicPlace, 3);
    const isEmpty = check.isEmpty(selectState, selectCity, inputPublicPlace);
    const ok = !isEmpty && !smallerThan ? true : false;

    if(!ok) {
      change.panelDisplay(addressPanel.parentNode, false);
      errors.show();
      return;
    }

    statesData.forEach(async ({ nome, sigla }) => {
      const stateName = selectState.value;
      const cityName = selectCity.value;
      const publicPlaceName = inputPublicPlace.value;

      if(stateName === nome) {
        const confirmation = await requisitions.getAddress(sigla, cityName, publicPlaceName);
        
        if(confirmation.length) {
          show.addressData(confirmation);
          change.panelDisplay(addressPanel.parentNode, true);
        } else {
          errors.add([inputPublicPlace], ['* Endereço inválido']);
          errors.show();
          change.panelDisplay(addressPanel.parentNode, false);
        }
      }
    });
  }
};

const change = {
  panelDisplay(panel, activate) {
    if(activate) {
      panel.style = `
        max-height: ${panel.scrollHeight}px;
        border: 1.5px solid #353535;
        margin-top: 25px;
      `;
    } else {
      panel.style = `
        max-height: ${null};
        border: none;
        margin-top: 0;
      `;
    }
  },
  page(event) {
    const page = event.target.dataset.index;
    const pageIndexes = [...pagination.children];

    pageIndexes.forEach(index => {
      index.classList.remove('selected');
    });

    event.target.classList.add('selected');
    
    addressPanel.innerHTML = '';

    panelFill(calcPageItems(page));
  }
};

/* GENERAL FUNCTIONS */

const order = array => {
	const modifiedArray = [];

	array.forEach(item => {
		modifiedArray.push({
			before: item,
			after: item.replace(/^[ÁÃÂÀ]/i, 'A')
        .replace(/^[ÉÊÈ]/i, 'E')
        .replace(/^[ÍÎÌ]/i, 'I')
        .replace(/^[ÓÕÔÒ]/i, 'O')
        .replace(/^[ÚÙÛ]/i, 'U')
    });
	});

	array.forEach((item, index) => {
		modifiedArray.forEach(({ before, after }) => {
      if(item === before) {
        array[index] = after;
      }
    });
  });

  array.sort();

  array.forEach((item, index) => {
    modifiedArray.forEach(({ before, after }) => {
      if(item === after) {
        array[index] = before;
      }
    });
  });
};

const panelFill = ({ start, end, quantityPages }) => {
  for(let i = start; i < end; i++) {
    const panelData = `
      <div class="address">
        <p><span>CEP:</span> ${addressData[i].cep}</p>
        <p><span>Logradouro:</span> ${addressData[i].logradouro}</p>
        <p><span>Bairro:</span> ${addressData[i].bairro}</p>
      </div>
    `;

    addressPanel.innerHTML += panelData;
  }

  change.panelDisplay(addressPanel.parentNode, true);
};

const calcPageItems = index => {
  const quantityItems = addressData.length;
  const itensPerPage = 5;
	
  const start = (index - 1) * itensPerPage;
  const end = index * itensPerPage < addressData.length
  ? index * itensPerPage
  : addressData.length;

  const quantityPages = quantityItems % itensPerPage !== 0
  ? Math.floor(quantityItems / itensPerPage) + 1
  : quantityItems / itensPerPage;

  return {
    start: start,
    end: end,
    quantityPages: quantityPages
  };
};

/* EVENT LISTENERS */

inputZipCode.addEventListener('input', (event) => {
  event.target.value = masks.cep(event.target.value);
});
inputPublicPlace.addEventListener('input', (event) => {
  event.target.value = masks.clearURLchars(event.target.value);
})
selectState.addEventListener('change', load.cities);
btnSearchByZipCode.addEventListener('click', search.byZipCode);
btnSearchByAddress.addEventListener('click', search.byAddress);
window.addEventListener('load', load.states);