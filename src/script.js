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
let addressData = [];

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

/* REQUISITIONS */

const getStates = async () => {
	const url = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados';
	const response = await fetch(url);
	return await response.json();
};

const getCities = async id => {
	const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${id}/municipios`;
	const response = await fetch(url);
	return await response.json();
}

/* CHECKING FUNCTIONS */

const confirmZipCode = async zipCode => {
	const url = `https://viacep.com.br/ws/${zipCode}/json/`;
	const response = await fetch(url);
	return response.json();
};

const confirmAddress = async (...inputs) => {
	const url = `https://viacep.com.br/ws/${inputs[0]}/${inputs[1]}/${inputs[2]}/json/`;
	const response = await fetch(url);
	return response.json();
};

/* LOADING FUNCTIONS */

const loadStates = async () => {
	const states = await getStates();
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
};

const loadCities = () => {
	const stateText = event.target.value;
	const cityNames = [];

	errors.removeElementError(selectCity, selectState);
	
	if(!stateText) {
		selectCity.innerHTML = '<option></option>';
		return;
	}

	statesData.forEach(async ({ id, nome }) => {
		if(nome === stateText) {
			loading.classList.add('loading');

			const cities = await getCities(id);

			changePanelDisplay(addressPanel.parentNode, false);

			selectCity.innerHTML = '<option></option>';

			cities.forEach(({ nome }) => {
				cityNames.push(nome);
			});

			order(cityNames);

			cityNames.forEach(cityName => {
				const option = `<option>${cityName}</option>`;
				selectCity.innerHTML += option;
			});

			loading.classList.remove('loading');
		}
	});
};



/* DISPLAY FUNCTIONS */

const showPageCounters = quantity => {
	clearElement(pagination);

	for(let i = 1; i <= quantity; i++) {
		const counter = `<p class="index" data-index="${i}">${i}</p>`;

		pagination.innerHTML += counter;
	}

	const pageIndexes = [...pagination.children];

	pageIndexes.forEach(index => {
		index.addEventListener('click', event => {changePage(event)});
	});

	pagination.firstElementChild.classList.add('selected');
};

const showZipCodeData = ({ uf, localidade, logradouro, bairro, complemento, cep }) => {
	const panelData = `
			<p class="zip-code"><span>CEP:</span> ${applyMask(cep)}</p>
			<p><span>UF:</span> ${uf}</p>
			<p><span>Localidade:</span> ${localidade}</p>
			<p><span>Logradouro:</span> ${logradouro}</p>
			<p><span>Bairro:</span> ${bairro}</p>
			<p><span>Complemento:</span> ${complemento}</p>
		`;

	zipCodePanel.innerHTML = panelData;
};

const showAddressData = data => {
	addressData.length = 0;

	data.forEach(({cep, logradouro, bairro}) => {
		addressData.push({
			cep: applyMask(cep),
			logradouro: logradouro,
			bairro: bairro
		});
	});
	
	const nextPageData = calcPageItems(1);

	clearElement(addressPanel);

	panelFill(nextPageData);

	showPageCounters(nextPageData.quantityPages);
};



/* SEARCH FUNCTIONS */

const searchByZipCode = async () => {
	errors.removeElementError(inputZipCode);
	const smallerThan = check.smallerThan(inputZipCode, 10);
	const isEmpty = check.isEmpty(inputZipCode);
	const ok = !isEmpty && !smallerThan ? true : false;
	
	if(!ok) {
		changePanelDisplay(zipCodePanel, false);
		errors.show();
		return;
	};

	const confirmation = await confirmZipCode(inputZipCode.value.replace(/\D/g, ''));

	if(confirmation.erro) {
		changePanelDisplay(zipCodePanel, false);
		errors.add([inputZipCode], ['* CEP inexistente']);
		errors.show();
	} else {
		showZipCodeData(confirmation);
		changePanelDisplay(zipCodePanel, true);
	}
};

const searchByAddress = () => {
	errors.removeElementError(selectState, selectCity, inputPublicPlace);

	const smallerThan = check.smallerThan(inputPublicPlace, 3);
	const isEmpty = check.isEmpty(selectState, selectCity, inputPublicPlace);
	const ok = !isEmpty && !smallerThan ? true : false;

	if(!ok) {
		changePanelDisplay(addressPanel.parentNode, false);
		errors.show();
		return;
	}

	statesData.forEach(async ({ nome, sigla }) => {
		const stateName = selectState.value;
		const cityName = selectCity.value;
		const publicPlaceName = inputPublicPlace.value;

		if(stateName === nome) {
			const confirmation = await confirmAddress(sigla, cityName, publicPlaceName);
			
			if(confirmation.length) {
				showAddressData(confirmation);
				changePanelDisplay(addressPanel.parentNode, true);
			} else {
				changePanelDisplay(addressPanel.parentNode, false);
			}
		}
	});
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

const changePanelDisplay = (panel, activate) => {
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
};

const changePage = event => {
	const page = event.target.dataset.index;
	const pageIndexes = [...pagination.children];

	pageIndexes.forEach(index => {
		index.classList.remove('selected');
	});

	event.target.classList.add('selected');
	
	clearElement(addressPanel);
	panelFill(calcPageItems(page));
};

const clearElement = (...elements) => {
	elements.forEach(element => element.innerHTML = '');
};


const applyMask = element => {
	const newElement = element.target ? element.target.value : element;

	return newElement.replace(/\D/g, '')
		.replace(/(\d{2})(\d)/, '$1.$2')
		.replace(/(\d{3})(\d)/, '$1-$2')
		.replace(/(-\d{3})\d+?$/, '$1');
};

/* EVENT LISTENERS */

inputZipCode.addEventListener('input', (event) => {
	event.target.value = applyMask(event);
});
selectState.addEventListener('change', loadCities);
btnSearchByZipCode.addEventListener('click', searchByZipCode);
btnSearchByAddress.addEventListener('click', searchByAddress);
window.addEventListener('load', loadStates);