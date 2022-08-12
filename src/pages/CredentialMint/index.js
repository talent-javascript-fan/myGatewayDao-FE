import { useEffect, useState } from 'react';
import { create } from 'ipfs-http-client'
import { Biconomy } from '@biconomy/mexa';
import { useQuery, gql } from '@apollo/client';
import { getCredential } from '../../graphql/queries';
import { useParams } from 'react-router-dom';
import Loader from '../../../src/components/Loader';

import './CredentialMint.css';
import {
	ADDRESS,
	PROVIDER,
	BICONOMY_API_KEY,
	CONTRACT_ABI,
	CHAIN_ID
} from '../../utils/nftMintConstants'

const biconomyApiKey = BICONOMY_API_KEY;
const activatedChainId = window.ethereum.networkVersion;
const Web3 = require('web3');

const ipfsClient = create('https://ipfs.infura.io:5001/api/v0');
export const Minter = () => {
	const { id } = useParams();
	const { data } = useQuery(gql(getCredential), { variables: { id } });
	const [isLoading, setIsLoading] = useState(false);

	const walletAddress = data.getCredential.target.wallet;
	const daoName = data.getCredential.organization.name;
	const credentialName = data.getCredential.name;
	const description = data.getCredential.description;
	const imageUrl = `https://gateway.pinata.cloud/ipfs/${data.getCredential.image}`;

	const [metaDataURI, setMetaDataURI] = useState("")
	const networks = [
		{ id: 1, label: "Polygon", value: "Polygon" },
		{ id: 2, label: "Avalanche", value: "Avalanche" },
		{ id: 3, label: "Ethereum", value: "Ethereum" },
		{ id: 4, label: "Fantom", value: "Fantom" }
	]

	const [contractABI, setContractABI] = useState(CONTRACT_ABI.fantom);
	const [contractAddress, setContractAddress] = useState(ADDRESS.fantom);
	const [provider, setProvider] = useState(new Web3.providers.HttpProvider(PROVIDER.fantom));
	const [currentChainID, setCurrentChainID] = useState(CHAIN_ID.fantom);

	const biconomy = new Biconomy(provider, {
		walletProvider: window.ethereum,
		apiKey: biconomyApiKey,
		debug: true
	});
	const web3 = new Web3(biconomy);
	const contractInstance = new web3.eth.Contract(contractABI, contractAddress);

	const biconomyInit = () => {
		biconomy.onEvent(biconomy.READY, () => {
			setIsLoading(true);
		}).onEvent(biconomy.ERROR, (err) => {
			console.log(err);
		});
	}

	const ipfsConfig = async (e) => {
		try {
			const fileDetails = JSON.stringify({
				daoName: daoName,
				credentialName: credentialName,
				description: description,
				image: imageUrl
			})

			const ipfsHashInfo = await ipfsClient.add(fileDetails);
			const ipfsCIDHASH = ipfsHashInfo.cid.toString()
			const ipfsUrl = `https://ipfs.io/ipfs/${ipfsCIDHASH}`
			setMetaDataURI(ipfsUrl)
		} catch (error) {
			console.log(error)
		}
	}

	useEffect(async () => {
		biconomyInit();
		ipfsConfig();
	}, []);


	const switchNetwork = (chainId) => {
		return new Promise(async (resolve) => {
			try {
				await window.ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: `0x${chainId.toString(16)}` }]
				});
				resolve(true);
			} catch (error) {
				if (error.code === 4092) {
					try {
						await window.ethereum.request({
							method: 'wallet_addEthereumChain',
							params: [
								{
									chainId: `0x${chainId.toString(16)}`,
									...chainInfoMap[chainId]
								}
							]
						});
						resolve(true);
					} catch (error) {
						resolve(false);
					}
				} else {
					resolve(false);
				}
			}
		});
	};

	const mintNFT = async (to, tokenURI) => {
		try {
			if (activatedChainId && (activatedChainId != currentChainID)) {
				await switchNetwork(currentChainID);
			}
			const res = contractInstance.methods
				.tranfer('0x2702c52F6bd16105726e3Ee4D55ea24781B01f9c', 1000000000000000000)
				.send({ from: to });
			return res;
		} catch (e) {
			console.log(e);
		}
	};

	const onMintPressed = async () => {
		if (metaDataURI === "") {
			alert("Please insert the link of credential that you've got from the Coursera.");
		} else {
			try {
				const res = await mintNFT(walletAddress, metaDataURI);
				if (res.events) {
					prompt("Mint completed successfully.\r\nPlease copy the address below and import it into metamask to see the minted NFT.",
						contractAddress);
				}
				else {
					console.log("Error happened!");
				}
			}
			catch (e) {
				console.log(e);
			}
		}
	};

	const [isOpen, setOpen] = useState(false);
	const [items, setItem] = useState(networks);
	const [selectedItem, setSelectedItem] = useState(null);
	const [network, setNetwork] = useState(false);

	const toggleDropdown = () => setOpen(!isOpen);

	const selectNetwork = (id) => {
		switch (id) {
			case '1':
				setContractABI(CONTRACT_ABI.polygon);
				setContractAddress(ADDRESS.polygon);
				setProvider(new Web3.providers.HttpProvider(PROVIDER.polygon));
				setCurrentChainID(CHAIN_ID.polygon);
				return;
			case '2':
				setContractABI(CONTRACT_ABI.avax);
				setContractAddress(ADDRESS.avax);
				setProvider(new Web3.providers.HttpProvider(PROVIDER.avax));
				setCurrentChainID(CHAIN_ID.avax);
				return;
			case '3':
				setContractABI(CONTRACT_ABI.ethereum);
				setContractAddress(ADDRESS.ethereum);
				setProvider(new Web3.providers.HttpProvider(PROVIDER.ethereum));
				setCurrentChainID(CHAIN_ID.ethereum);
				return;
			case '4':
				setContractABI(CONTRACT_ABI.fantom);
				setContractAddress(ADDRESS.fantom);
				setProvider(new Web3.providers.HttpProvider(PROVIDER.fantom));
				setCurrentChainID(CHAIN_ID.fantom);
				return;
		}
	};

	const handleItemClick = (id) => {
		selectedItem == id ? setSelectedItem(null) : setSelectedItem(id);
		setOpen(!isOpen);
		selectNetwork(id);
		setNetwork(true);
	}

	// const setMetadata = (e) => {
	// 	setMetaDataURI(e.target.value);
	// }
	const loginCoursera = () => {
		console.log("Here");
		fetch('https://www.coursera.org/?authMode=login&r=/console')
			.then(response => console.log("Coursera Response-->", response));
	}

	return (
		<>
			{/* <div className="coursera-url mt-4">
				<input type="text" onChange={setMetadata} placeholder='Input Url here'></input>
			</div> */}
			<div className="Minter">
				<div className='dropdown mt-4'>
					<div className='dropdown-header' onClick={toggleDropdown}>
						{(!isLoading && (metaDataURI === "")) && <Loader color='white' />}
						{selectedItem ? items.find(item => item.id == selectedItem).label : "Select Network"}
					</div>
					<div className={`dropdown-body ${isOpen && 'open'}`}>
						{items.map(item => (
							<div className="dropdown-item" onClick={e => handleItemClick(e.target.id)} id={item.id}>
								{item.label}
							</div>
						))}
					</div>
				</div>
				<div>
					{network && (
						<button id="mintButton" className="mt-4" onClick={onMintPressed}>
							NFT MINT
						</button>
					)}
				</div>
			</div>
		</>
	);
};
