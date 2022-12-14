import { useEffect, useState } from 'react';
import { create } from 'ipfs-http-client'
import { Biconomy } from '@biconomy/mexa';
import { useQuery, gql } from '@apollo/client';
import { getCredential } from '../../graphql/queries';
import { useParams, useNavigate, Navigate } from 'react-router-dom';

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


export const Minter = ({ credential }) => {
	const navigate = useNavigate();
	const walletAddress = credential.target.wallet;
	const daoName = credential.organization.name;
	const credentialName = credential.name;
	const description = credential.description;
	const imageUrl = `https://gateway.pinata.cloud/ipfs/${credential.image}`;

	const [metaDataURI, setMetaDataURI] = useState(``);
	const networks = [
		{ id: 1, label: "Polygon", value: "Polygon" },
		{ id: 2, label: "Avalanche", value: "Avalanche" },
		{ id: 3, label: "Ethereum", value: "Ethereum" }
	]

	const [contractABI, setContractABI] = useState(CONTRACT_ABI.polygon);
	const [contractAddress, setContractAddress] = useState(ADDRESS.polygon);
	const [provider, setProvider] = useState(new Web3.providers.HttpProvider(PROVIDER.polygon));
	const [currentChainID, setCurrentChainID] = useState(CHAIN_ID.polygon);

	const biconomy = new Biconomy(provider, {
		walletProvider: window.ethereum,
		apiKey: biconomyApiKey,
		debug: true
	});

	// const web3 = new Web3(biconomy);
	// const web3 = new Web3(window.ethereum);
	// const contractInstance = new web3.eth.Contract(contractABI, contractAddress);

	useEffect(async () => {
		biconomyInit();
		ipfsConfig();
	}, []);

	const biconomyInit = () => {
		biconomy.onEvent(biconomy.READY, () => {
		}).onEvent(biconomy.ERROR, (err, msg) => {
			console.log(err);
		});
	}
	const ipfsConfig = async () => {
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
			console.log({ ipfsUrl });
			setMetaDataURI(ipfsUrl);
		} catch (error) {
			console.log(error)
		}
	}

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
		const web3 = new Web3(biconomy);
		// const web3 = new Web3(window.ethereum);
		const contractInstance = new web3.eth.Contract(contractABI, contractAddress);
		try {
			if (activatedChainId && (activatedChainId != currentChainID)) {
				await switchNetwork(currentChainID);
			}
			console.log("!!!");
			navigate('');
			const hashRes = await contractInstance.methods
				.mint(to, tokenURI)
				.send({ from: to });
			console.log("@@@", hashRes);
			return hashRes;
		} catch (e) {
			console.log(e);
		}
	};

	const onMintPressed = async () => {
		console.log('Mint button is clicked!');
		if (metaDataURI == ``) {
			alert("Please click 'Create NFT' first.");
			return;
		}
		try {
			if (activatedChainId && (activatedChainId != currentChainID)) {
				await switchNetwork(currentChainID);
			}
			const res = await mintNFT(walletAddress, metaDataURI);
			navigate('/profile');
			console.log(res)
			console.log("Mint completed!");
			console.log({ res });
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
		}
	};

	const handleItemClick = (id) => {
		selectedItem == id ? setSelectedItem(null) : setSelectedItem(id);
		setOpen(!isOpen);
		selectNetwork(id);
		setNetwork(true);
		ipfsConfig();
	}

	return (
		<div className="Minter">
			<div className='dropdown mt-4'>
				<div className='dropdown-header' onClick={toggleDropdown}>
					{selectedItem ? items.find(item => item.id == selectedItem).label : "Network"}
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
					<button id="mintButton" className="mt-4" onClick={() => onMintPressed}>
						MINT
					</button>
				)}
			</div>
		</div>
	);
};
