const inputZipCode = document.querySelector('#zipCode');
const inputPublicPlace = document.querySelector('#publicPlace');
const selectState = document.querySelector('#state');
const selectCity = document.querySelector('#city');
const btnSearchByZipCode = document.querySelector('#SearchByZipCode');
const btnSearchByAddress = document.querySelector('#SearchByAddress');
const zipCodePanel = document.querySelector('.zipCodePanel');
const addressPanel = document.querySelector('.addressPanel');
const pagination = document.querySelector('.pagination');

const statesData = [];

let addressData = [];
//let errors = [];



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

const checkInput = (checkType, inputs) => {
	let ok = true;

	//errors.length = 0;

	if(checkType === 'isEqualToTen') {
		if(inputs.length === 0) {
			ok = false;
			/*errors.push({
				input: inputZipCode,
				error: '* Preencha este campo'
			});*/
		} else if(inputs.length !== 10) {
			ok = false;
			/*errors.push({
				input: inputZipCode,
				error: '* Formato inválido'
			});*/
		}
	}

	if(checkType === 'non-zero') {
		inputs.forEach((input, index) => {
			if(input.length === 0) {
				ok = false;
			} else if(index === 2 && input.length < 3) {
				ok = false;
			}
		});
	}
	
	return ok;
};



/* LOADING FUNCTIONS */

const loadStates = async () => {
	const states = await getStates();
	
	states.forEach(state => {
		const option = `<option>${state.nome}</option>`;
		selectState.innerHTML += option;

		statesData.push(state);
	});
};

const loadCities = () => {
	const stateText = event.target.value;
	
	if(!stateText) return;

	statesData.forEach(async ({ id, nome }) => {
		if(nome === stateText) {
			const cities = await getCities(id);

			changePanelDisplay(addressPanel.parentNode, false);

			selectCity.innerHTML = '<option></option>';

			cities.forEach(({ nome }) => {
				const option = `<option>${nome}</option>`;
				selectCity.innerHTML += option;
			});
		}
	});
};



/* DISPLAY FUNCTIONS */

/*const showErrorMessage = () => {
	errors.forEach(({ error, input }) => {
		input.nextElementSibling.innerHTML = error;
	});
};*/

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
	const zipCode = inputZipCode.value;
	const ok = checkInput('isEqualToTen', zipCode);
	
	if(!ok) {
		changePanelDisplay(zipCodePanel, false);
		//showErrorMessage();
		return;
	};

	const confirmation = await confirmZipCode(zipCode.replace(/\D/g, ''));

	/*errors = [{
		input: inputZipCode,
		error: '&nbsp;'
	}];*/

	if(confirmation.erro) {
		/*errors.push({
			input: inputZipCode,
			error: '* CEP não foi encontrado'
		});*/
		changePanelDisplay(zipCodePanel, false);
	} else {
		showZipCodeData(confirmation);
		changePanelDisplay(zipCodePanel, true);
	}
	
	//showErrorMessage();
};

const searchByAddress = () => {
	const stateName = selectState.options[selectState.selectedIndex].value;
	const cityName = selectCity.options[selectCity.selectedIndex].value;
	const publicPlaceName = inputPublicPlace.value
	const inputs = [stateName, cityName, publicPlaceName];

	const ok = checkInput('non-zero', inputs);

	if(!ok) {
		changePanelDisplay(addressPanel.parentNode, false);
		return;
	}

	statesData.forEach(async ({ nome, sigla }) => {
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

const applyMask = event => {
	const element = event.target ? event.target.value : event;

	return element.replace(/\D/g, '')
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

/*

[x] função pra limpar os containers (pagination, selectCity...)
[x] alternância entre as páginas (Pesquisa por Endereço)
[ ] ordenar alfabeticamente os options
[ ] mensagens de erro na Pesquisa por Endereço

*/