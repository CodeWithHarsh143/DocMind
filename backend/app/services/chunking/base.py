from abc import ABC, abstractmethod


class ChunkingStrategy(ABC):
    @abstractmethod
    def chunk(self, text: str) -> list[str]:
        """It is just a blueprint for all the strategy for chuking to declare or use Same name for algorithum which is chunking"""
        pass
